import { describe, it, expect } from "vitest";
import {
  displayRegStatus,
  isApprovedStatus,
  ageFromDob,
  generateCheckInCode,
  isProgramType,
  isProgramStatus,
} from "@/lib/gicn";

describe("registration status normalisation", () => {
  it("maps legacy values to the current vocabulary", () => {
    expect(displayRegStatus("CONFIRMED")).toBe("APPROVED");
    expect(displayRegStatus("PENDING")).toBe("SUBMITTED");
  });

  it("passes through known statuses and defaults unknowns to SUBMITTED", () => {
    expect(displayRegStatus("APPROVED")).toBe("APPROVED");
    expect(displayRegStatus("WAITLISTED")).toBe("WAITLISTED");
    expect(displayRegStatus("garbage")).toBe("SUBMITTED");
  });

  it("isApprovedStatus is true only for the 'in' state (incl. legacy CONFIRMED)", () => {
    expect(isApprovedStatus("APPROVED")).toBe(true);
    expect(isApprovedStatus("CONFIRMED")).toBe(true);
    expect(isApprovedStatus("WAITLISTED")).toBe(false);
    expect(isApprovedStatus("SUBMITTED")).toBe(false);
  });
});

describe("ageFromDob", () => {
  it("is 0 for someone born today", () => {
    expect(ageFromDob(new Date())).toBe(0);
  });

  it("counts full years for an already-passed birthday", () => {
    // Jan 1 has always passed by any later date in the year.
    const y = new Date().getFullYear();
    expect(ageFromDob(new Date(y - 25, 0, 1))).toBe(25);
  });
});

describe("generateCheckInCode", () => {
  it("matches GICN-XXXXXX with an unambiguous alphabet (no I/O/0/1)", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateCheckInCode()).toMatch(/^GICN-[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});

describe("type guards", () => {
  it("isProgramType", () => {
    expect(isProgramType("SCHOLARSHIP")).toBe(true);
    expect(isProgramType("NOT_A_TYPE")).toBe(false);
  });
  it("isProgramStatus", () => {
    expect(isProgramStatus("OPEN")).toBe(true);
    expect(isProgramStatus("DRAFT")).toBe(true);
    expect(isProgramStatus("LIVE")).toBe(false);
  });
});
