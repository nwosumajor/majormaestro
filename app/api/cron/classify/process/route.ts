import { NextRequest, NextResponse } from "next/server";
import { processClassificationQueue } from "@/lib/bulkClassify";

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
  const result = await processClassificationQueue();
  return NextResponse.json({ ok: true, ...result });
}

// Vercel Cron prefers GET; mirror behaviour to be tolerant of any scheduler.
export async function GET(req: NextRequest) {
  return POST(req);
}
