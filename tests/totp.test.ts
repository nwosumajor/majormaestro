import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateSync } from "otplib";
import { encryptSecret, decryptSecret, generateSecret, verifyCode } from "@/lib/totp";

const KEY_A = "a".repeat(64); // ≥32 chars
const KEY_B = "b".repeat(64);

describe("encryptSecret / decryptSecret (AES-256-GCM — protects NIN + TOTP secrets)", () => {
  beforeEach(() => { process.env.ADMIN_SESSION_SECRET = KEY_A; });
  afterEach(() => { delete process.env.ADMIN_SESSION_SECRET; });

  it("round-trips a variety of plaintexts", () => {
    for (const pt of ["12345678901", "JBSWY3DPEHPK3PXP", "ünïcödé 🔐", "x"]) {
      expect(decryptSecret(encryptSecret(pt))).toBe(pt);
    }
  });

  it("produces the iv:tag:ciphertext shape and a fresh IV each time", () => {
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(a).not.toBe(b); // random IV → different ciphertext for identical input
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const enc = encryptSecret("12345678901");
    const [iv, tag, data] = enc.split(":");
    const flip = (h: string) => h.slice(0, -1) + (h.slice(-1) === "a" ? "b" : "a");
    expect(() => decryptSecret(`${iv}:${tag}:${flip(data)}`)).toThrow();
    expect(() => decryptSecret(`${iv}:${flip(tag)}:${data}`)).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow(/Malformed/);
  });

  it("cannot be decrypted with a different ADMIN_SESSION_SECRET", () => {
    const enc = encryptSecret("12345678901");
    process.env.ADMIN_SESSION_SECRET = KEY_B;
    expect(() => decryptSecret(enc)).toThrow();
  });

  it("throws if the key secret is missing or too short", () => {
    process.env.ADMIN_SESSION_SECRET = "short";
    expect(() => encryptSecret("x")).toThrow();
    delete process.env.ADMIN_SESSION_SECRET;
    expect(() => encryptSecret("x")).toThrow();
  });
});

describe("verifyCode (TOTP)", () => {
  it("accepts a freshly generated token and rejects wrong/garbage input", () => {
    const secret = generateSecret();
    expect(verifyCode(secret, generateSync({ strategy: "totp", secret }))).toBe(true);
    expect(verifyCode(secret, "000000")).toBe(false);
    expect(verifyCode(secret, "not-a-code")).toBe(false);
    expect(verifyCode(secret, "")).toBe(false);
  });
});
