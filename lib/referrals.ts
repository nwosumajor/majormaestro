// Referral reward computation — single source for the admin view, the payout
// endpoint, and the referrer dashboard so the numbers can't drift.
//
// Reward model: ₦100,000 fixed bonus per referred case that completes a forensic
// audit (status findings/engagement/recovered), plus 5% of the recovered amount
// on each recovered case. "Owed" = earned − already paid out.

export const FIXED_BONUS_KOBO = BigInt(100_000) * BigInt(100); // ₦100,000
export const RECOVERY_COMMISSION_PCT = 5; // %

const AUDIT_COMPLETE = new Set(["findings", "engagement", "recovered"]);

export interface ComplaintForOwed {
  status: string;
  recoveryAmountKobo: bigint | null;
}

export interface OwedBreakdown {
  completedAudits: number;
  recoveredCount: number;
  bonusKobo: bigint;
  commissionKobo: bigint;
  earnedKobo: bigint;
}

export function computeEarned(complaints: ComplaintForOwed[]): OwedBreakdown {
  const completedAudits = complaints.filter((c) => AUDIT_COMPLETE.has(c.status)).length;
  const recoveredCount = complaints.filter((c) => c.status === "recovered").length;
  const bonusKobo = BigInt(completedAudits) * FIXED_BONUS_KOBO;
  let commissionKobo = BigInt(0);
  for (const c of complaints) {
    if (c.status === "recovered" && c.recoveryAmountKobo) {
      commissionKobo += (c.recoveryAmountKobo * BigInt(RECOVERY_COMMISSION_PCT)) / BigInt(100);
    }
  }
  return { completedAudits, recoveredCount, bonusKobo, commissionKobo, earnedKobo: bonusKobo + commissionKobo };
}

export function nairaFromKobo(kobo: bigint): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    Number(kobo) / 100
  );
}
