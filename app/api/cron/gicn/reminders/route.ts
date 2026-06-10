import { NextRequest, NextResponse } from "next/server";
import { sendDueProgrammeReminders } from "@/lib/gicnReminders";

// GICN programme reminders: for each APPROVED registration on an OPEN/CLOSED
// programme starting within the next few days, email the owning adult a check-in
// reminder. Idempotent (AuditLog-backed) so re-runs never double-email.
//
// Scheduler-agnostic (GET or POST; CRON_SECRET via Bearer or X-Cron-Secret).
// Driven daily by .github/workflows/gicn-reminders.yml.
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
  const summary = await sendDueProgrammeReminders();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
