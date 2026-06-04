import { NextRequest, NextResponse } from "next/server";

// TIER 2 (scaffold): GICN programme reminders.
//
// Intended behaviour (not yet implemented): for each OPEN/CLOSED programme
// starting within the next N days, email the owning adult (guardian/school)
// for every CONFIRMED registration a reminder with the check-in code. Reuse
// lib/email.ts (Resend) and respect the same CRON_SECRET auth + GET/POST
// convention as the other cron endpoints. Add to vercel.json crons when built.
function checkCronAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (req.headers.get("authorization") === `Bearer ${expected}`) return true;
  if (req.headers.get("x-cron-secret") === expected) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // TODO(tier2): query due programmes + send reminder emails.
  return NextResponse.json({ ok: true, sent: 0, note: "GICN reminders not yet implemented (Tier 2 scaffold)." });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
