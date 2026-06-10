import { describe, it, expect } from "vitest";
import { STEP_KEYS, STEP_DEFS, TEAMS, pickTeam } from "@/lib/recoverySteps";

describe("recovery step machine", () => {
  it("has the canonical 7-step lifecycle in order", () => {
    expect(STEP_KEYS).toEqual(["received", "reviewing", "documents", "auditing", "findings", "engagement", "recovered"]);
  });

  it("defines a label + description for every step", () => {
    for (const k of STEP_KEYS) {
      expect(STEP_DEFS[k]?.label).toBeTruthy();
      expect(STEP_DEFS[k]?.description).toBeTruthy();
    }
  });
});

describe("pickTeam", () => {
  it("is deterministic for a given seed", () => {
    expect(pickTeam("GBN-ABC123")).toBe(pickTeam("GBN-ABC123"));
  });

  it("always returns a known team", () => {
    for (const seed of ["a", "GBN-ZZZ", "GBN-MPCAJVI7-C8ZD", "", "12345"]) {
      expect(TEAMS).toContain(pickTeam(seed));
    }
  });

  it("distributes across teams over many seeds", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(pickTeam(`GBN-${i}`));
    expect(seen.size).toBeGreaterThan(1);
  });
});
