import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaystackSignature, newSponsorshipReference, isPaymentConfigured } from "@/lib/payments";

const KEY = "sk_test_dummy_key_123";
const sign = (body: string, key = KEY) => createHmac("sha512", key).update(body, "utf8").digest("hex");

describe("verifyPaystackSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "gicn-abc", amount: 5000000, currency: "NGN" } });

  beforeEach(() => { process.env.PAYSTACK_SECRET_KEY = KEY; });
  afterEach(() => { delete process.env.PAYSTACK_SECRET_KEY; });

  it("accepts a valid signature", () => {
    expect(verifyPaystackSignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyPaystackSignature(body + " ", sign(body))).toBe(false);
  });

  it("rejects a signature made with a different key", () => {
    expect(verifyPaystackSignature(body, sign(body, "sk_test_other"))).toBe(false);
  });

  it("rejects garbage and null signatures", () => {
    expect(verifyPaystackSignature(body, "deadbeef")).toBe(false);
    expect(verifyPaystackSignature(body, null)).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    expect(verifyPaystackSignature(body, sign(body))).toBe(false);
  });
});

describe("newSponsorshipReference", () => {
  it("produces a Paystack-safe, unique reference", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const r = newSponsorshipReference();
      expect(r).toMatch(/^gicn-[0-9a-f-]{36}$/);
      expect(seen.has(r)).toBe(false);
      seen.add(r);
    }
  });
});

describe("isPaymentConfigured", () => {
  afterEach(() => { delete process.env.PAYSTACK_SECRET_KEY; });

  it("is false when unset", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    expect(isPaymentConfigured()).toBe(false);
  });

  it("is false for a non-sk_ value", () => {
    process.env.PAYSTACK_SECRET_KEY = "nope";
    expect(isPaymentConfigured()).toBe(false);
  });

  it("is true for sk_test_ and sk_live_ keys", () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_abc";
    expect(isPaymentConfigured()).toBe(true);
    process.env.PAYSTACK_SECRET_KEY = "sk_live_abc";
    expect(isPaymentConfigured()).toBe(true);
  });
});
