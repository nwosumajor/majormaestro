// Server-side orchestration for a scholarship review-board decision: validates
// the transition (lib/scholarship), applies the per-action field changes,
// appends to the board timeline (ScholarshipReview), and audits. Shared by the
// admin decide route and (Phase 2) the guardian onboarding-submit.

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import {
  canTransition,
  targetStatus,
  isScholarshipStatus,
  type ScholarshipAction,
  type ScholarshipStatus,
} from "@/lib/scholarship";

export interface DecisionInput {
  note?: string;
  // award fields (action: "award")
  awardAmountNgn?: number;
  term?: string;
  academicYear?: string;
  conditionsSummary?: string;
  // renewal (action: "renew" / "verify_activate")
  renewalDueAt?: string; // ISO date
}

export interface DecisionResult {
  ok: boolean;
  status?: ScholarshipStatus;
  error?: string;
}

export async function applyScholarshipDecision(
  awardId: string,
  action: ScholarshipAction,
  actor: string,
  input: DecisionInput = {}
): Promise<DecisionResult> {
  if (!db) return { ok: false, error: "unavailable" };

  const award = await db.scholarshipAward.findUnique({ where: { id: awardId }, select: { id: true, status: true } });
  if (!award) return { ok: false, error: "not_found" };
  if (!isScholarshipStatus(award.status)) return { ok: false, error: "bad_status" };
  if (!canTransition(action, award.status)) {
    return { ok: false, error: `Action "${action}" is not allowed from "${award.status}".` };
  }

  const to = targetStatus(action)!;
  const now = new Date();
  const data: Record<string, unknown> = { status: to };

  switch (action) {
    case "claim":
      data.reviewedBy = actor;
      data.reviewedAt = now;
      break;
    case "award": {
      data.awardedBy = actor;
      data.awardedAt = now;
      data.reviewedBy = actor;
      data.reviewedAt = now;
      if (Number.isFinite(input.awardAmountNgn) && (input.awardAmountNgn as number) >= 0) {
        data.awardAmountKobo = BigInt(Math.round((input.awardAmountNgn as number) * 100));
      }
      if (input.term) data.term = input.term;
      if (input.academicYear) data.academicYear = input.academicYear;
      if (input.conditionsSummary) data.conditionsSummary = input.conditionsSummary;
      if (input.note) data.reviewNote = input.note;
      break;
    }
    case "reject":
    case "request_changes":
    case "terminate":
    case "withdraw":
      data.reviewedBy = actor;
      data.reviewedAt = now;
      if (input.note) data.reviewNote = input.note;
      break;
    case "onboarding_submit":
      data.onboardingSubmittedAt = now;
      break;
    case "verify_activate":
      data.activatedAt = now;
      if (input.renewalDueAt && !Number.isNaN(Date.parse(input.renewalDueAt))) data.renewalDueAt = new Date(input.renewalDueAt);
      break;
    case "suspend":
      data.suspendedReason = input.note ?? null;
      break;
    case "reinstate":
      data.suspendedReason = null;
      break;
    case "renew":
      if (input.renewalDueAt && !Number.isNaN(Date.parse(input.renewalDueAt))) data.renewalDueAt = new Date(input.renewalDueAt);
      break;
    case "complete":
    default:
      break;
  }

  await db.$transaction([
    db.scholarshipAward.update({ where: { id: awardId }, data }),
    db.scholarshipReview.create({ data: { awardId, reviewerEmail: actor, action, note: input.note ?? null } }),
  ]);

  await recordAudit({
    action: `gicn_scholarship_${action}`,
    actorLabel: actor,
    targetType: "ScholarshipAward",
    targetId: awardId,
    metadata: { from: award.status, to },
  });

  return { ok: true, status: to };
}
