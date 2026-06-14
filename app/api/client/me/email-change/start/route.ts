import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { sendEmailChangeConfirmation } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MINUTES = 30;

function generateToken(): string {
  return randomBytes(32).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = await rateLimit(`email-change:${user.id}`, 3, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many email change attempts. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const { newEmail } = (await req.json().catch(() => ({}))) as { newEmail?: string };
  if (!newEmail || !EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: "A valid new email address is required." }, { status: 400 });
  }

  const normNew = newEmail.trim().toLowerCase();
  if (normNew === user.email.toLowerCase()) {
    return NextResponse.json({ error: "That's already your current email." }, { status: 400 });
  }

  // Refuse if some other account already owns that email
  const conflict = await db.user.findUnique({ where: { email: normNew } });
  if (conflict) {
    return NextResponse.json(
      { error: "An account already exists with that email. Sign in to that account instead." },
      { status: 409 }
    );
  }

  // Burn any prior unused email-change tokens for this user — only one in flight at a time.
  await db.emailChangeToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await db.emailChangeToken.create({
    data: { userId: user.id, newEmail: normNew, tokenHash, expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  const verifyUrl = `${base}/api/client/me/email-change/verify?token=${encodeURIComponent(token)}`;

  let emailResult: { skipped: boolean } = { skipped: true };
  try {
    emailResult = await sendEmailChangeConfirmation(normNew, user.email, verifyUrl);
  } catch (err) {
    console.error("[email-change/start] send error:", err);
  }

  await recordAudit({
    action: "email_change_request",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { newEmail: normNew, ip, emailSkipped: emailResult.skipped },
  });

  const devMode = process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;
  return NextResponse.json({
    success: true,
    message: `Confirmation sent to ${normNew}. It expires in ${TOKEN_TTL_MINUTES} minutes.`,
    ...(devMode ? { devVerifyUrl: verifyUrl } : {}),
  });
}
