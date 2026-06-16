import { NextRequest, NextResponse, after } from "next/server";
import { drainAndContinue } from "@/lib/bulkClassify";

function checkCronAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  // Accept either header form (mirrors /api/cron/webhooks/retry)
  const headerAuth = req.headers.get("authorization");
  if (headerAuth === `Bearer ${expected}`) return true;
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader === expected) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Process one chunk + self-continue AFTER the response flushes, so the chain's
  // ping returns immediately (no synchronous chaining / timeout) and large batches
  // drain in minutes rather than 25 rows/day via the daily cron.
  after(() => drainAndContinue().catch((e) => console.error("[cron/classify] drain error:", e)));
  return NextResponse.json({ ok: true, scheduled: true });
}

// Vercel Cron prefers GET; mirror behaviour to be tolerant of any scheduler.
export async function GET(req: NextRequest) {
  return POST(req);
}
