// GICN programme reminders: email the owning adult (guardian/school) a check-in
// reminder for every APPROVED registration on a programme starting soon.
// Idempotency is stored in the AuditLog (action "gicn_reminder_sent") so a
// registration is never reminded twice — no schema change required.

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { sendGicnProgrammeReminder } from "@/lib/email";

const REMINDER_WINDOW_DAYS = 3;

export interface ReminderSummary {
  windowDays: number;
  due: number;
  sent: number;
  skipped: number;
}

export async function sendDueProgrammeReminders(): Promise<ReminderSummary> {
  const summary: ReminderSummary = { windowDays: REMINDER_WINDOW_DAYS, due: 0, sent: 0, skipped: 0 };
  if (!db) return summary;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // APPROVED registrations (incl. legacy CONFIRMED) on OPEN/CLOSED programmes
  // starting within the window.
  const regs = await db.programRegistration.findMany({
    where: {
      status: { in: ["APPROVED", "CONFIRMED"] },
      program: { status: { in: ["OPEN", "CLOSED"] }, startsAt: { gte: now, lte: windowEnd } },
    },
    select: {
      id: true,
      checkInCode: true,
      participant: { select: { fullName: true, owner: { select: { email: true } } } },
      program: { select: { title: true, startsAt: true, location: true } },
    },
  });
  summary.due = regs.length;
  if (regs.length === 0) return summary;

  // Idempotency: skip registrations already reminded (audit log is the store).
  const already = await db.auditLog.findMany({
    where: { action: "gicn_reminder_sent", targetId: { in: regs.map((r) => r.id) } },
    select: { targetId: true },
  });
  const reminded = new Set(already.map((a) => a.targetId));

  for (const r of regs) {
    if (reminded.has(r.id)) { summary.skipped++; continue; }
    const ownerEmail = r.participant.owner?.email;
    if (!ownerEmail) { summary.skipped++; continue; }
    try {
      await sendGicnProgrammeReminder({
        ownerEmail,
        childName: r.participant.fullName,
        programTitle: r.program.title,
        startsAt: r.program.startsAt,
        location: r.program.location,
        checkInCode: r.checkInCode,
      });
      // Record AFTER a successful send so a failure is retried next run.
      await recordAudit({
        action: "gicn_reminder_sent",
        actorLabel: "system:cron",
        targetType: "ProgramRegistration",
        targetId: r.id,
        metadata: { programTitle: r.program.title },
      });
      summary.sent++;
    } catch (e) {
      console.error("[gicn-reminders] send error:", e);
      summary.skipped++;
    }
  }

  return summary;
}
