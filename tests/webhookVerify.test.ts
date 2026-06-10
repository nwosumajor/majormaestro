import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhook, signatureMatches, MAX_AGE_MS } from "@/lib/webhookVerify";

const SECRET = "whsec_test_secret";
const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
const envelope = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ event: "case.status_changed", sentAt: new Date().toISOString(), data: { referenceId: "GBN-X" }, ...over });

describe("signatureMatches", () => {
  const body = envelope();
  it("accepts a correct signature and rejects everything else", () => {
    expect(signatureMatches(body, sign(body), SECRET)).toBe(true);
    expect(signatureMatches(body, sign(body, "other"), SECRET)).toBe(false);
    expect(signatureMatches(body, "sha256=deadbeef", SECRET)).toBe(false);
    expect(signatureMatches(body, null, SECRET)).toBe(false);
    expect(signatureMatches(body + " ", sign(body), SECRET)).toBe(false);
  });
});

describe("verifyWebhook gate", () => {
  it("accepts a well-formed, fresh, correctly-signed delivery", () => {
    const body = envelope();
    const res = verifyWebhook(body, sign(body), SECRET);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.envelope.event).toBe("case.status_changed");
  });

  it("fails closed when no secret is configured", () => {
    const body = envelope();
    expect(verifyWebhook(body, sign(body), undefined)).toMatchObject({ ok: false, reason: "secret_not_configured" });
  });

  it("rejects an oversized body before anything else", () => {
    const body = JSON.stringify({ event: "x", sentAt: new Date().toISOString(), data: { blob: "a".repeat(70 * 1024) } });
    expect(verifyWebhook(body, "anything", SECRET)).toMatchObject({ ok: false, reason: "body_too_large" });
  });

  it("rejects a missing or wrong signature", () => {
    const body = envelope();
    expect(verifyWebhook(body, null, SECRET)).toMatchObject({ ok: false, reason: "missing_signature" });
    expect(verifyWebhook(body, sign(body, "wrong"), SECRET)).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("rejects a malformed or mis-shaped body (after a valid signature)", () => {
    const notJson = "not json at all";
    expect(verifyWebhook(notJson, sign(notJson), SECRET)).toMatchObject({ ok: false, reason: "malformed_body" });
    const missing = JSON.stringify({ event: "x" }); // no sentAt/data
    expect(verifyWebhook(missing, sign(missing), SECRET)).toMatchObject({ ok: false, reason: "malformed_body" });
  });

  it("rejects stale and far-future deliveries (replay bounds)", () => {
    const stale = envelope({ sentAt: new Date(Date.now() - MAX_AGE_MS - 60_000).toISOString() });
    expect(verifyWebhook(stale, sign(stale), SECRET)).toMatchObject({ ok: false, reason: "stale" });
    const future = envelope({ sentAt: new Date(Date.now() + 10 * 60_000).toISOString() });
    expect(verifyWebhook(future, sign(future), SECRET)).toMatchObject({ ok: false, reason: "stale" });
  });
});
