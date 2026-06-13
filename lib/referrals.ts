// Referral reward computation — single source for the admin view, the payout
// endpoint, and the referrer dashboard so the numbers can't drift.
//
// Reward model: a fixed bonus per referred case that completes a forensic audit
// (status findings/engagement/recovered), scaled to the referred organisation's
// annual turnover band, PLUS 5% of the recovered amount on each recovered case.
// Larger organisations (and high-volume LC / trade-finance importers) carry more
// recoverable excess, so they earn the referrer a larger bonus. "Owed" = earned
// − already paid out.
//
// Bonus tiers by turnover band:
//   ₦5M – ₦49M    → ₦50,000
//   ₦50M – ₦200M  → ₦75,000
//   ₦200M – ₦1B   → ₦100,000
//   ₦1B – ₦5B     → ₦200,000
//   Above ₦5B     → ₦200,000

const naira = (n: number) => BigInt(n) * BigInt(100); // naira → kobo

/** Fixed referral bonus per completed audit, keyed by the persisted turnover band. */
export const BONUS_TIERS_KOBO: Record<string, bigint> = {
  "₦5M – ₦49M": naira(50_000),
  "₦50M – ₦200M": naira(75_000),
  "₦200M – ₦1B": naira(100_000),
  "₦1B – ₦5B": naira(200_000),
  "Above ₦5B": naira(200_000),
};

/** Bonus for an unknown/legacy band — defaults to the historical flat ₦100,000. */
export const DEFAULT_BONUS_KOBO = naira(100_000);

export const RECOVERY_COMMISSION_PCT = 5; // %

/** Resolve the fixed bonus for a referred organisation's turnover band. */
export function bonusKoboForBand(turnoverBand: string | null | undefined): bigint {
  if (turnoverBand && turnoverBand in BONUS_TIERS_KOBO) return BONUS_TIERS_KOBO[turnoverBand];
  return DEFAULT_BONUS_KOBO;
}

const AUDIT_COMPLETE = new Set(["findings", "engagement", "recovered"]);

export interface ComplaintForOwed {
  status: string;
  recoveryAmountKobo: bigint | null;
  turnoverBand: string;
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
  let bonusKobo = BigInt(0);
  let commissionKobo = BigInt(0);
  for (const c of complaints) {
    if (AUDIT_COMPLETE.has(c.status)) {
      bonusKobo += bonusKoboForBand(c.turnoverBand);
    }
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
