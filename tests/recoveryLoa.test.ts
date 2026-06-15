import { describe, it, expect } from "vitest";
import {
  isAuthorizationMethod,
  sanitizeSignatories,
  checkLoaConformance,
  authorizationMethodLabel,
} from "@/lib/recoveryLoa";

describe("authorization method", () => {
  it("validates and labels methods", () => {
    expect(isAuthorizationMethod("two_directors")).toBe(true);
    expect(isAuthorizationMethod("nope")).toBe(false);
    expect(authorizationMethodLabel("board_resolution")).toContain("Board Resolution");
    expect(authorizationMethodLabel(null)).toBe("—");
  });
});

describe("sanitizeSignatories", () => {
  it("trims, drops nameless entries, caps to 10", () => {
    const out = sanitizeSignatories([
      { name: "  Ada  ", title: " Director " },
      { name: "", title: "Director" },
      { title: "no name" },
      "garbage",
    ]);
    expect(out).toEqual([{ name: "Ada", title: "Director" }]);
    expect(sanitizeSignatories(null)).toEqual([]);
    expect(sanitizeSignatories(Array.from({ length: 20 }, () => ({ name: "x" }))).length).toBe(10);
  });
});

describe("checkLoaConformance", () => {
  const two = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `D${i}`, title: "Director" }));

  it("two_directors needs >=2 signatories + LoA doc", () => {
    expect(checkLoaConformance({ method: "two_directors", signatories: two(2), companyHasSoleDirector: false, documentTypes: ["letter-of-authority"] }).ok).toBe(true);
    expect(checkLoaConformance({ method: "two_directors", signatories: two(1), companyHasSoleDirector: false, documentTypes: ["letter-of-authority"] }).ok).toBe(false);
    expect(checkLoaConformance({ method: "two_directors", signatories: two(2), companyHasSoleDirector: false, documentTypes: [] }).ok).toBe(false);
  });

  it("sole_director needs the sole-director flag + >=1 signatory + LoA doc", () => {
    expect(checkLoaConformance({ method: "sole_director", signatories: two(1), companyHasSoleDirector: true, documentTypes: ["letter-of-authority"] }).ok).toBe(true);
    expect(checkLoaConformance({ method: "sole_director", signatories: two(1), companyHasSoleDirector: false, documentTypes: ["letter-of-authority"] }).ok).toBe(false);
  });

  it("board_resolution needs the board-resolution doc", () => {
    expect(checkLoaConformance({ method: "board_resolution", signatories: [], companyHasSoleDirector: false, documentTypes: ["board-resolution"] }).ok).toBe(true);
    expect(checkLoaConformance({ method: "board_resolution", signatories: [], companyHasSoleDirector: false, documentTypes: ["letter-of-authority"] }).ok).toBe(false);
  });
});
