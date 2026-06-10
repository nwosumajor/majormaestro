// Server-side orchestration for confirming a GICN sponsorship payment.
// Shared by the Paystack webhook AND the post-payment callback page, so both
// paths converge on one idempotent, amount-checked confirmation.

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { verifyTransaction } from "@/lib/payments";

export type ConfirmOutcome =
  | "paid" // already paid, or just confirmed now
  | "pending" // not yet successful at Paystack
  | "not_found" // no sponsorship with that reference
  | "mismatch" // amount/currency did not match — withheld, logged
  | "unavailable"; // DB not configured

export interface ConfirmResult {
  outcome: ConfirmOutcome;
  /** True only on the single transition pending → paid (so the caller emails once). */
  justConfirmed: boolean;
  email?: { sponsorEmail: string; sponsorName: string; amountKobo: bigint; programTitle: string | null };
}

/**
 * Verify a reference against Paystack and, on a matching success, flip the
 * Sponsorship to "paid" exactly once. Idempotent: safe to call repeatedly from
 * the webhook and the callback. Never grants value on a mismatched amount.
 */
export async function confirmSponsorshipByReference(reference: string): Promise<ConfirmResult> {
  if (!db) return { outcome: "unavailable", justConfirmed: false };

  const sp = await db.sponsorship.findUnique({
    where: { reference },
    select: { id: true, amountKobo: true, status: true, sponsorName: true, sponsorEmail: true, programId: true },
  });
  if (!sp) return { outcome: "not_found", justConfirmed: false };

  if (sp.status === "paid") return { outcome: "paid", justConfirmed: false };

  // Authoritative check — never trust a webhook body alone.
  const v = await verifyTransaction(reference);
  if (!v.ok || v.status !== "success") return { outcome: "pending", justConfirmed: false };

  // Defend against tampered/mismatched amounts before granting value.
  if (v.currency !== "NGN" || v.amountKobo !== Number(sp.amountKobo)) {
    await recordAudit({
      action: "gicn_sponsorship_amount_mismatch",
      actorLabel: sp.sponsorEmail,
      targetType: "Sponsorship",
      targetId: sp.id,
      metadata: { reference, expectedKobo: sp.amountKobo.toString(), paidKobo: String(v.amountKobo), currency: v.currency },
    });
    return { outcome: "mismatch", justConfirmed: false };
  }

  // Idempotent transition: only the first writer flips pending → paid.
  const upd = await db.sponsorship.updateMany({
    where: { id: sp.id, status: { not: "paid" } },
    data: { status: "paid", paidAt: v.paidAt ?? new Date(), providerRef: v.providerRef ?? undefined },
  });

  if (upd.count === 0) return { outcome: "paid", justConfirmed: false };

  const programTitle = sp.programId
    ? (await db.program.findUnique({ where: { id: sp.programId }, select: { title: true } }))?.title ?? null
    : null;

  await recordAudit({
    action: "gicn_sponsorship_paid",
    actorLabel: sp.sponsorEmail,
    targetType: "Sponsorship",
    targetId: sp.id,
    metadata: { reference, amountKobo: sp.amountKobo.toString() },
  });

  return {
    outcome: "paid",
    justConfirmed: true,
    email: { sponsorEmail: sp.sponsorEmail, sponsorName: sp.sponsorName, amountKobo: sp.amountKobo, programTitle },
  };
}
