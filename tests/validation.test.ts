import { describe, it, expect } from "vitest";
import { isValidEmail, validatePhone } from "@/lib/validation";

describe("isValidEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(isValidEmail("a.okonkwo@company.com")).toBe(true);
    expect(isValidEmail("nwosumajor+intake@gmail.com")).toBe(true);
  });

  it("rejects malformed / empty / oversized addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("two@@at.com")).toBe(false);
    expect(isValidEmail(`${"a".repeat(250)}@x.com`)).toBe(false);
  });

  it("trims surrounding whitespace before checking", () => {
    expect(isValidEmail("  a@b.com  ")).toBe(true);
  });
});

describe("validatePhone", () => {
  it("normalizes a Nigerian local number to E.164", () => {
    const r = validatePhone("0803 123 4567");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+2348031234567");
  });

  it("honors an explicit international prefix", () => {
    const r = validatePhone("+44 20 7946 0958");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+442079460958");
  });

  it("rejects junk / empty / implausible numbers", () => {
    expect(validatePhone("").ok).toBe(false);
    expect(validatePhone(null).ok).toBe(false);
    expect(validatePhone("123").ok).toBe(false);
    expect(validatePhone("not a phone").ok).toBe(false);
  });
});
