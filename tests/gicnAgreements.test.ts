import { describe, it, expect } from "vitest";
import { GICN_AGREEMENTS } from "@/lib/policies/gicnAgreements";
import { computeGicnAcknowledgementHash } from "@/lib/gicnAgreementHash";
import { isGuardianRelationship, GUARDIAN_RELATIONSHIPS } from "@/lib/gicn";

describe("GICN agreements bundle", () => {
  it("has a version, date and all four agreements", () => {
    expect(GICN_AGREEMENTS.version).toMatch(/^gicn-agreements-v\d+$/);
    expect(GICN_AGREEMENTS.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const keys = GICN_AGREEMENTS.agreements.map((a) => a.key).sort();
    expect(keys).toEqual(["indemnity", "privacy", "safeguarding", "terms"]);
    for (const a of GICN_AGREEMENTS.agreements) {
      expect(a.title.trim().length).toBeGreaterThan(0);
      expect(a.sections.length).toBeGreaterThan(0);
    }
  });
});

describe("guardian relationship", () => {
  it("validates declared relationships", () => {
    for (const r of GUARDIAN_RELATIONSHIPS) expect(isGuardianRelationship(r)).toBe(true);
    expect(isGuardianRelationship("uncle")).toBe(false);
    expect(isGuardianRelationship(null)).toBe(false);
  });
});

describe("computeGicnAcknowledgementHash", () => {
  const base = { bundleVersion: "gicn-agreements-v1", userId: "u1", kind: "guardian", acceptedByName: "Ada T", acceptedAt: "2026-06-16T10:00:00.000Z" };
  it("is deterministic and tamper-evident", () => {
    expect(computeGicnAcknowledgementHash(base)).toBe(computeGicnAcknowledgementHash(base));
    expect(computeGicnAcknowledgementHash(base)).toMatch(/^[a-f0-9]{64}$/);
    expect(computeGicnAcknowledgementHash({ ...base, acceptedByName: "Someone" })).not.toBe(computeGicnAcknowledgementHash(base));
  });
});
