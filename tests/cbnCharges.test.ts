import { describe, it, expect } from "vitest";
import {
  CBN_CHARGES,
  getCharge,
  numericCheckableCharges,
  cbnReferenceForAI,
  CURRENT_MPR,
  lcCollateralMinRate,
  lcCollateralInterestOwed,
} from "@/lib/cbnCharges";

describe("LC cash-collateral interest math", () => {
  it("computes the 30%-of-MPR minimum rate", () => {
    expect(lcCollateralMinRate(27.5)).toBe(8.25);
    expect(lcCollateralMinRate(20)).toBe(6);
  });

  it("uses CURRENT_MPR by default", () => {
    expect(lcCollateralMinRate()).toBe(lcCollateralMinRate(CURRENT_MPR));
  });

  it("computes interest owed (cover x rate x months/12)", () => {
    // ₦50,000,000 x 8.25% x 18/12 = ₦6,187,500
    expect(lcCollateralInterestOwed(50_000_000, 18, 27.5)).toBe(6_187_500);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(lcCollateralInterestOwed(0, 18)).toBe(0);
    expect(lcCollateralInterestOwed(50_000_000, 0)).toBe(0);
    expect(lcCollateralInterestOwed(-1, 18)).toBe(0);
  });
});

describe("CBN_CHARGES dataset invariants", () => {
  it("has unique ids", () => {
    const ids = CBN_CHARGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getCharge resolves a known id and rejects unknown", () => {
    expect(getCharge("camf")?.id).toBe("camf");
    expect(getCharge("does-not-exist")).toBeUndefined();
  });

  it("numericCheckableCharges only returns in-force entries with a ceilingValue", () => {
    for (const c of numericCheckableCharges()) {
      expect(c.status).toBe("in_force");
      expect(typeof c.ceilingValue).toBe("number");
    }
  });

  it("COT is recorded as abolished/historical, not a current charge", () => {
    const cot = getCharge("cot");
    expect(cot?.status).toBe("abolished");
    expect(cot?.kind).toBe("historical");
  });

  it("LC confirmation ceiling is 0.5% of face value", () => {
    expect(getCharge("lc_confirmation")?.ceilingValue).toBe(0.5);
  });
});

describe("cbnReferenceForAI", () => {
  const ref = cbnReferenceForAI();
  it("encodes the corrected accuracy rules and rejects the old myths", () => {
    expect(ref).toContain("COT is ABOLISHED");
    expect(ref).toContain("NO 'MPR + 7%' cap");
    expect(ref).toContain("NO flat '$25' SWIFT cap");
    // Trade-finance additions
    expect(ref).toContain("30% of MPR on LC cash collateral");
  });
});
