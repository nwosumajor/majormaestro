import { describe, it, expect } from "vitest";
import {
  computeEarned,
  bonusKoboForBand,
  BONUS_TIERS_KOBO,
  DEFAULT_BONUS_KOBO,
  RECOVERY_COMMISSION_PCT,
  type ComplaintForOwed,
} from "@/lib/referrals";

const k = (naira: number) => BigInt(naira) * BigInt(100);

describe("bonusKoboForBand", () => {
  it("maps each turnover band to its tier", () => {
    expect(bonusKoboForBand("₦5M – ₦49M")).toBe(k(50_000));
    expect(bonusKoboForBand("₦50M – ₦200M")).toBe(k(75_000));
    expect(bonusKoboForBand("₦200M – ₦1B")).toBe(k(100_000));
    expect(bonusKoboForBand("₦1B – ₦5B")).toBe(k(200_000));
    expect(bonusKoboForBand("Above ₦5B")).toBe(k(200_000));
  });

  it("falls back to the historical flat bonus for unknown/legacy bands", () => {
    expect(bonusKoboForBand("something legacy")).toBe(DEFAULT_BONUS_KOBO);
    expect(bonusKoboForBand("")).toBe(DEFAULT_BONUS_KOBO);
    expect(bonusKoboForBand(null)).toBe(DEFAULT_BONUS_KOBO);
    expect(DEFAULT_BONUS_KOBO).toBe(k(100_000));
  });

  it("top two bands both pay the ₦200k high-volume tier", () => {
    expect(BONUS_TIERS_KOBO["₦1B – ₦5B"]).toBe(BONUS_TIERS_KOBO["Above ₦5B"]);
  });
});

describe("computeEarned", () => {
  const c = (status: string, turnoverBand: string, recoveryNaira?: number): ComplaintForOwed => ({
    status,
    turnoverBand,
    recoveryAmountKobo: recoveryNaira == null ? null : k(recoveryNaira),
  });

  it("pays no bonus before an audit completes", () => {
    const r = computeEarned([c("received", "₦200M – ₦1B"), c("auditing", "₦1B – ₦5B")]);
    expect(r.completedAudits).toBe(0);
    expect(r.bonusKobo).toBe(BigInt(0));
    expect(r.earnedKobo).toBe(BigInt(0));
  });

  it("pays the band-tiered bonus once the audit completes (findings/engagement/recovered)", () => {
    const r = computeEarned([
      c("findings", "₦5M – ₦49M"), // ₦50k
      c("engagement", "₦50M – ₦200M"), // ₦75k
      c("recovered", "₦1B – ₦5B", 0), // ₦200k bonus, 0 recovered
    ]);
    expect(r.completedAudits).toBe(3);
    expect(r.bonusKobo).toBe(k(50_000) + k(75_000) + k(200_000));
  });

  it("adds 5% commission on top of the bonus for recovered cases", () => {
    const r = computeEarned([c("recovered", "₦200M – ₦1B", 10_000_000)]); // ₦10M recovered
    expect(r.recoveredCount).toBe(1);
    expect(r.bonusKobo).toBe(k(100_000));
    expect(r.commissionKobo).toBe((k(10_000_000) * BigInt(RECOVERY_COMMISSION_PCT)) / BigInt(100)); // ₦500k
    expect(r.earnedKobo).toBe(k(100_000) + k(500_000));
  });

  it("handles an empty list", () => {
    const r = computeEarned([]);
    expect(r).toEqual({
      completedAudits: 0,
      recoveredCount: 0,
      bonusKobo: BigInt(0),
      commissionKobo: BigInt(0),
      earnedKobo: BigInt(0),
    });
  });
});
