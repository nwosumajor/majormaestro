import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { sendMagicLink } from "@/lib/email";
import { recordAudit } from "@/lib/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MINUTES = 15;

function generateToken(): string {
  return randomBytes(32).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const ip = getClientIp(req);
  const ipRl = rateLimit(`magic-ip:${ip}`, 5, 60 * 60);
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(ipRl) }
    );
  }

  const { email, next: rawNext } = (await req.json().catch(() => ({}))) as {
    email?: string;
    next?: string;
  };
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const normEmail = email.trim().toLowerCase();

  // Per-email rate limit (separately from per-IP)
  const emailRl = rateLimit(`magic-email:${normEmail}`, 3, 60 * 60);
  if (!emailRl.ok) {
    return NextResponse.json(
      { error: "Too many sign-in attempts for this email. Try again later." },
      { status: 429, headers: rateLimitHeaders(emailRl) }
    );
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await db.magicLinkToken.create({
    data: { email: normEmail, tokenHash, expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  const next = rawNext && /^\/[^/]/.test(rawNext) ? rawNext : "/client/dashboard";
  const signInUrl = `${base}/api/auth/email/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;

  let emailResult: { skipped: boolean } = { skipped: true };
  try {
    emailResult = await sendMagicLink(normEmail, signInUrl);
  } catch (err) {
    console.error("[/api/auth/email/start] Email send error:", err);
  }

  await recordAudit({
    action: "magic_link_request",
    actorLabel: normEmail,
    metadata: { ip, emailSkipped: emailResult.skipped },
  });

  // In dev (no RESEND_API_KEY), surface the URL so testing isn't blocked. NEVER in prod.
  const devMode = process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;

  return NextResponse.json({
    success: true,
    message: "If that email is valid, a sign-in link has been sent. Check your inbox (and spam).",
    ...(devMode ? { devSignInUrl: signInUrl } : {}),
  });
}
