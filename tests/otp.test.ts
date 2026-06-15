import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtp, normalizeOtpTarget, isOtpChannel } from "@/lib/otp";

describe("otp primitives", () => {
  it("generates a 6-digit zero-padded code", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("hashes deterministically and differs per code", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
    expect(hashOtp("123456")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes targets per channel", () => {
    expect(normalizeOtpTarget("email", "  Ada@Company.COM ")).toBe("ada@company.com");
    expect(normalizeOtpTarget("sms", " +2348031234567 ")).toBe("+2348031234567");
  });

  it("validates channels", () => {
    expect(isOtpChannel("email")).toBe(true);
    expect(isOtpChannel("sms")).toBe(true);
    expect(isOtpChannel("whatsapp")).toBe(false);
    expect(isOtpChannel(null)).toBe(false);
  });
});
