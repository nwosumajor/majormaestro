import { describe, it, expect } from "vitest";
import {
  isRepresentativeIdType,
  representativeIdLabel,
  REPRESENTATIVE_ID_TYPES,
} from "@/lib/recoveryKyc";

describe("recoveryKyc", () => {
  it("accepts every declared ID type and rejects others", () => {
    for (const t of REPRESENTATIVE_ID_TYPES) expect(isRepresentativeIdType(t)).toBe(true);
    expect(isRepresentativeIdType("bvn")).toBe(false);
    expect(isRepresentativeIdType("")).toBe(false);
    expect(isRepresentativeIdType(null)).toBe(false);
    expect(isRepresentativeIdType(undefined)).toBe(false);
  });

  it("labels known types and falls back to a dash", () => {
    expect(representativeIdLabel("passport")).toBe("International Passport");
    expect(representativeIdLabel("nin")).toContain("NIN");
    expect(representativeIdLabel("bogus")).toBe("—");
    expect(representativeIdLabel(null)).toBe("—");
  });
});
