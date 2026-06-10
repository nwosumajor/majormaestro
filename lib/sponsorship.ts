// Server-side orchestration for confirming a GICN sponsorship payment.
// Shared by the Paystack webhook AND the post-payment callback page, so both
// paths converge on one idempotent, amount-checked confirmation.

import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { verifyTransaction, isPaymentConfigured } from "@/lib/payments";

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

// ── Reconciliation ──────────────────────────────────────────────────────────
// A stuck `pending` sponsorship is one whose webhook AND callback both missed
// (a real success to confirm) or whose sponsor abandoned checkout (to fail).
// The reconcile sweep resolves them so the ledger never drifts.

/** Don't touch fresh pendings — the normal webhook/callback handles those. */
const RECONCILE_GRACE_MS = 15 * 60 * 1000; // 15 minutes
/** A pending still not successful at Paystack after this is treated as abandoned. */
const RECONCILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

type SponsorEmail = { sponsorEmail: string; sponsorName: string; amountKobo: bigint; programTitle: string | null };

export interface ReconcileSummary {
  configured: boolean;
  checked: number;
  confirmed: number;
  failed: number;
  skipped: number;
  /** Sponsors whose payment was confirmed during this sweep — caller emails them. */
  emails: SponsorEmail[];
}

/** Idempotently flip a still-pending sponsorship to `failed` (audited). */
export async function markSponsorshipFailed(id: string, reason: string): Promise<boolean> {
  if (!db) return false;
  const upd = await db.sponsorship.updateMany({ where: { id, status: "pending" }, data: { status: "failed" } });
  if (upd.count === 0) return false;
  await recordAudit({ action: "gicn_sponsorship_failed", actorLabel: "system:reconcile", targetType: "Sponsorship", targetId: id, metadata: { reason } });
  return true;
}

/**
 * Sweep stale `pending` sponsorships and resolve each against Paystack:
 *  - success           → confirm (idempotent paid flip + email)
 *  - failed/abandoned/reversed → mark failed
 *  - still ongoing but older than the max age → mark failed (abandoned)
 *  - transient verify error → leave for the next run
 * No-op (and never marks anything failed) when Paystack is unconfigured.
 */
export async function reconcilePendingSponsorships(limit = 100): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { configured: isPaymentConfigured(), checked: 0, confirmed: 0, failed: 0, skipped: 0, emails: [] };
  if (!db || !summary.configured) return summary;

  const now = Date.now();
  const rows = await db.sponsorship.findMany({
    where: { status: "pending", reference: { not: null }, createdAt: { lt: new Date(now - RECONCILE_GRACE_MS) } },
    select: { id: true, reference: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const row of rows) {
    summary.checked++;
    if (!row.reference) { summary.skipped++; continue; }

    const v = await verifyTransaction(row.reference);
    if (!v.ok) { summary.skipped++; continue; } // transient — try again next run

    if (v.status === "success") {
      const r = await confirmSponsorshipByReference(row.reference);
      if (r.outcome === "paid") {
        summary.confirmed++;
        if (r.justConfirmed && r.email) summary.emails.push(r.email);
      } else {
        summary.skipped++; // mismatch (logged) or transient
      }
    } else if (v.status === "failed" || v.status === "abandoned" || v.status === "reversed") {
      if (await markSponsorshipFailed(row.id, `paystack:${v.status}`)) summary.failed++;
      else summary.skipped++;
    } else if (now - row.createdAt.getTime() > RECONCILE_MAX_AGE_MS) {
      // ongoing/pending/processing/queued for too long → abandoned
      if (await markSponsorshipFailed(row.id, `abandoned:${v.status}`)) summary.failed++;
      else summary.skipped++;
    } else {
      summary.skipped++;
    }
  }

  return summary;
}
