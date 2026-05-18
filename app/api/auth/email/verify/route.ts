import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { USER_COOKIE, userCookieOptions } from "@/lib/auth";
import { createClientSession } from "@/lib/sessions";
import { recordAudit } from "@/lib/audit";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function errorRedirect(req: NextRequest, message: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/client/signin";
  url.search = `?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  if (!db) return errorRedirect(req, "Database unavailable.");

  const token = req.nextUrl.searchParams.get("token");
  const rawNext = req.nextUrl.searchParams.get("next");
  if (!token) return errorRedirect(req, "Missing sign-in token.");

  const tokenHash = hashToken(token);
  const record = await db.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record) {
    return errorRedirect(req, "Invalid or expired sign-in link.");
  }
  if (record.usedAt) {
    return errorRedirect(req, "This sign-in link has already been used.");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return errorRedirect(req, "This sign-in link has expired.");
  }

  // Upsert user
  const existing = await db.user.findUnique({ where: { email: record.email } });
  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), emailVerified: new Date() },
      })
    : await db.user.create({
        data: {
          email: record.email,
          emailVerified: new Date(),
          lastLoginAt: new Date(),
        },
      });

  // Mark token used and clean up other unused tokens for this email
  await db.$transaction([
    db.magicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.magicLinkToken.deleteMany({
      where: { email: record.email, usedAt: null, id: { not: record.id } },
    }),
  ]);

  // Auto-link complaints by email
  const linkResult = await db.recoveryComplaint.updateMany({
    where: { contactEmail: { equals: record.email, mode: "insensitive" }, userId: null },
    data: { userId: user.id },
  });

  await recordAudit({
    action: "magic_link_signin",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { linkedComplaints: linkResult.count, isNew: !existing },
  });

  const next = rawNext && /^\/[^/]/.test(rawNext) ? rawNext : "/client/dashboard";
  const url = req.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  const res = NextResponse.redirect(url);
  const session = await createClientSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip"),
  });
  res.cookies.set(USER_COOKIE, session.token, userCookieOptions());
  return res;
}
