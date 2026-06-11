import { NextRequest, NextResponse } from "next/server";
import { sendDueScholarshipReminders } from "@/lib/scholarshipReminders";

// Scholarship monitoring nudges: renewal reminders (to guardians) + at-risk
// nudges (to the board). Idempotent (AuditLog-backed). Scheduler-agnostic
// (GET/POST; CRON_SECRET via Bearer or X-Cron-Secret). Driven daily by
// .github/workflows/gicn-scholarship-reminders.yml.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkCronAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (req.headers.get("authorization") === `Bearer ${expected}`) return true;
  if (req.headers.get("x-cron-secret") === expected) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await sendDueScholarshipReminders();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
