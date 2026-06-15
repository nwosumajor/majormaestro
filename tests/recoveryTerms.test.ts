import { describe, it, expect } from "vitest";
import { RECOVERY_TERMS } from "@/lib/policies/recoveryTerms";
import { computeAcknowledgementHash } from "@/lib/recoveryTermsHash";

describe("RECOVERY_TERMS policy", () => {
  it("has a version, effective date and non-empty sections", () => {
    expect(RECOVERY_TERMS.version).toMatch(/^recovery-tos-v\d+$/);
    expect(RECOVERY_TERMS.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(RECOVERY_TERMS.sections.length).toBeGreaterThanOrEqual(8);
    for (const s of RECOVERY_TERMS.sections) {
      expect(s.heading.trim().length).toBeGreaterThan(0);
      expect(s.body.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("computeAcknowledgementHash", () => {
  const base = {
    policyVersion: "recovery-tos-v1",
    referenceId: "GBN-TEST-0001",
    companyName: "Acme Ltd",
    rcNumber: "RC123",
    acceptedByName: "Ada T",
    acceptedAt: "2026-06-15T10:00:00.000Z",
  };

  it("is deterministic for identical input", () => {
    expect(computeAcknowledgementHash(base)).toBe(computeAcknowledgementHash(base));
    expect(computeAcknowledgementHash(base)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when any field changes (tamper-evident)", () => {
    const h = computeAcknowledgementHash(base);
    expect(computeAcknowledgementHash({ ...base, acceptedByName: "Someone Else" })).not.toBe(h);
    expect(computeAcknowledgementHash({ ...base, referenceId: "GBN-TEST-0002" })).not.toBe(h);
  });
});
