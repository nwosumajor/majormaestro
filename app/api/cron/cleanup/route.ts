import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkCronAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const headerAuth = req.headers.get("authorization");
  if (headerAuth === `Bearer ${expected}`) return true;
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader === expected) return true;
  return false;
}

async function runCleanup() {
  if (!db) return { magicLinkTokens: 0, emailChangeTokens: 0, sessions: 0, otpChallenges: 0, analyticsEvents: 0 };
  const now = new Date();
  const grace = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day past expiry
  // Analytics events are only ever queried over the last 30 days; keep a wider
  // window for ad-hoc review, then purge so the hot table stays bounded.
  const analyticsRetentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS) || 180;
  const analyticsCutoff = new Date(now.getTime() - analyticsRetentionDays * 24 * 60 * 60 * 1000);

  const [magicLinkTokens, emailChangeTokens, sessions, otpChallenges, analyticsEvents] = await Promise.all([
    db.magicLinkToken.deleteMany({ where: { expiresAt: { lt: grace } } }),
    db.emailChangeToken.deleteMany({ where: { expiresAt: { lt: grace } } }),
    // Drop revoked OR expired sessions older than the grace window.
    db.session.deleteMany({
      where: {
        OR: [
          { revokedAt: { not: null, lt: grace } },
          { expiresAt: { lt: grace } },
        ],
      },
    }),
    // OTP challenges past expiry (consumed or not) are no longer useful.
    db.otpChallenge.deleteMany({ where: { expiresAt: { lt: grace } } }),
    // First-party analytics events past the retention window (keeps the table bounded).
    db.analyticsEvent.deleteMany({ where: { createdAt: { lt: analyticsCutoff } } }),
  ]);

  return {
    magicLinkTokens: magicLinkTokens.count,
    emailChangeTokens: emailChangeTokens.count,
    sessions: sessions.count,
    otpChallenges: otpChallenges.count,
    analyticsEvents: analyticsEvents.count,
  };
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runCleanup();
  return NextResponse.json({ ok: true, deleted: result });
}

// Cron-style schedulers prefer GET for free-plan triggers
export async function GET(req: NextRequest) {
  return POST(req);
}
