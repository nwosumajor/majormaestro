// Scholarship monitoring nudges: renewal reminders to guardians, and at-risk
// nudges to the board. Idempotency is stored in the AuditLog (per award + the
// specific due-date / academic-record) so re-runs never double-email.

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { sendScholarshipRenewalReminder, sendScholarshipAtRiskNudge } from "@/lib/email";

const RENEWAL_WINDOW_DAYS = 14;

export interface ScholarshipReminderSummary {
  windowDays: number;
  renewalReminders: number;
  atRiskNudges: number;
}

export async function sendDueScholarshipReminders(): Promise<ScholarshipReminderSummary> {
  const summary: ScholarshipReminderSummary = { windowDays: RENEWAL_WINDOW_DAYS, renewalReminders: 0, atRiskNudges: 0 };
  if (!db) return summary;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // ── 1. Renewal reminders (active, renewalDueAt within the window) ──────────
  const renewals = await db.scholarshipAward.findMany({
    where: { status: "active", renewalDueAt: { gte: now, lte: windowEnd } },
    select: {
      id: true, renewalDueAt: true,
      participant: { select: { fullName: true, owner: { select: { email: true } } } },
      program: { select: { title: true } },
    },
  });
  for (const r of renewals) {
    if (!r.renewalDueAt) continue;
    const guardianEmail = r.participant.owner?.email;
    if (!guardianEmail) continue;
    // One reminder per award per due-date (survives a board re-renewal).
    const marker = `${r.id}:renew:${r.renewalDueAt.toISOString().slice(0, 10)}`;
    const seen = await db.auditLog.findFirst({ where: { action: "gicn_scholarship_renewal_reminded", targetId: marker }, select: { id: true } });
    if (seen) continue;
    try {
      await sendScholarshipRenewalReminder(guardianEmail, { childName: r.participant.fullName, programTitle: r.program.title, dueAt: r.renewalDueAt });
      await recordAudit({ action: "gicn_scholarship_renewal_reminded", actorLabel: "system:cron", targetType: "ScholarshipAward", targetId: marker, metadata: { awardId: r.id } });
      summary.renewalReminders++;
    } catch (e) {
      console.error("[scholarship-reminders] renewal email error:", e);
    }
  }

  // ── 2. At-risk nudges (latest academic record is at_risk/breach) ───────────
  const flagged = await db.scholarshipAward.findMany({
    where: { status: { in: ["active", "suspended"] }, academicRecords: { some: { standing: { in: ["at_risk", "breach"] } } } },
    select: {
      id: true, reference: true,
      participant: { select: { fullName: true } },
      program: { select: { title: true } },
      academicRecords: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, standing: true, term: true } },
    },
  });
  for (const a of flagged) {
    const latest = a.academicRecords[0];
    if (!latest || !["at_risk", "breach"].includes(latest.standing)) continue; // only if the MOST RECENT record is still flagged
    const marker = `${a.id}:atrisk:${latest.id}`;
    const seen = await db.auditLog.findFirst({ where: { action: "gicn_scholarship_atrisk_nudged", targetId: marker }, select: { id: true } });
    if (seen) continue;
    try {
      await sendScholarshipAtRiskNudge({ childName: a.participant.fullName, programTitle: a.program.title, standing: latest.standing, term: latest.term, reference: a.reference });
      await recordAudit({ action: "gicn_scholarship_atrisk_nudged", actorLabel: "system:cron", targetType: "ScholarshipAward", targetId: marker, metadata: { awardId: a.id } });
      summary.atRiskNudges++;
    } catch (e) {
      console.error("[scholarship-reminders] at-risk email error:", e);
    }
  }

  return summary;
}
