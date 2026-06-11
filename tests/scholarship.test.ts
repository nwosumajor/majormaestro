import { describe, it, expect } from "vitest";
import {
  canTransition,
  targetStatus,
  isTerminalStatus,
  isScholarshipStatus,
  isScholarshipAction,
  newScholarshipReference,
} from "@/lib/scholarship";

describe("scholarship transitions (the review-board rules)", () => {
  it("allows award only from applied/under_review", () => {
    expect(canTransition("award", "applied")).toBe(true);
    expect(canTransition("award", "under_review")).toBe(true);
    expect(canTransition("award", "active")).toBe(false);
    expect(canTransition("award", "awarded")).toBe(false);
  });

  it("activates only from onboarding", () => {
    expect(canTransition("verify_activate", "onboarding")).toBe(true);
    expect(canTransition("verify_activate", "awarded")).toBe(false);
  });

  it("suspend/reinstate flip between active and suspended", () => {
    expect(canTransition("suspend", "active")).toBe(true);
    expect(canTransition("suspend", "suspended")).toBe(false);
    expect(canTransition("reinstate", "suspended")).toBe(true);
    expect(canTransition("reinstate", "active")).toBe(false);
  });

  it("does not treat creation actions as transitions", () => {
    expect(canTransition("apply", "applied")).toBe(false);
    expect(canTransition("nominate", "under_review")).toBe(false);
  });

  it("maps actions to their target status", () => {
    expect(targetStatus("award")).toBe("awarded");
    expect(targetStatus("verify_activate")).toBe("active");
    expect(targetStatus("renew")).toBe("active");
    expect(targetStatus("terminate")).toBe("terminated");
  });
});

describe("terminal states + guards", () => {
  it("flags terminal statuses", () => {
    for (const s of ["completed", "terminated", "withdrawn", "rejected"] as const) expect(isTerminalStatus(s)).toBe(true);
    for (const s of ["active", "awarded", "onboarding", "suspended"] as const) expect(isTerminalStatus(s)).toBe(false);
  });

  it("type guards accept valid values and reject junk", () => {
    expect(isScholarshipStatus("active")).toBe(true);
    expect(isScholarshipStatus("nope")).toBe(false);
    expect(isScholarshipAction("award")).toBe(true);
    expect(isScholarshipAction("explode")).toBe(false);
  });
});

describe("newScholarshipReference", () => {
  it("produces a unique SCH-XXXXXX with an unambiguous alphabet", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const r = newScholarshipReference();
      expect(r).toMatch(/^SCH-[A-HJ-NP-Z2-9]{6}$/);
      expect(seen.has(r)).toBe(false);
      seen.add(r);
    }
  });
});
