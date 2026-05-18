import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function redirect(req: NextRequest, path: string, error?: string) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  url.search = error ? `?email_change_error=${encodeURIComponent(error)}` : "?email_changed=1";
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  if (!db) return redirect(req, "/client/account", "Database unavailable.");
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return redirect(req, "/client/account", "Missing token.");

  const tokenHash = hashToken(token);
  const record = await db.emailChangeToken.findUnique({ where: { tokenHash } });
  if (!record) return redirect(req, "/client/account", "Invalid or expired link.");
  if (record.usedAt) return redirect(req, "/client/account", "This link has already been used.");
  if (record.expiresAt.getTime() < Date.now()) return redirect(req, "/client/account", "This link has expired.");

  // Race-check: somebody could have grabbed the new email in the interim
  const conflict = await db.user.findFirst({
    where: { email: record.newEmail, NOT: { id: record.userId } },
  });
  if (conflict) return redirect(req, "/client/account", "Another account now uses that email.");

  const user = await db.user.findUnique({ where: { id: record.userId } });
  if (!user) return redirect(req, "/client/signin", "Account no longer exists.");

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { email: record.newEmail, emailVerified: new Date() },
    }),
    db.emailChangeToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Wipe any pending magic-link tokens for either email — old links are now stale.
    db.magicLinkToken.deleteMany({
      where: { email: { in: [user.email, record.newEmail] }, usedAt: null },
    }),
  ]);

  await recordAudit({
    action: "email_change_complete",
    actorLabel: record.newEmail,
    targetType: "User",
    targetId: record.userId,
    metadata: { previousEmail: user.email },
  });

  return redirect(req, "/client/account");
}
