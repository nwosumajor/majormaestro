import { describe, it, expect } from "vitest";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

// Unique key per test so the shared in-memory store never bleeds across tests.
const uniq = () => `test:${Math.random().toString(36).slice(2)}`;

describe("rateLimit (in-memory sliding window)", () => {
  it("allows up to the limit, then blocks", () => {
    const key = uniq();
    const limit = 5;
    for (let i = 0; i < limit; i++) {
      const r = rateLimit(key, limit, 3600);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(limit - 1 - i);
    }
    const blocked = rateLimit(key, limit, 3600);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks separate keys independently", () => {
    const a = uniq();
    const b = uniq();
    rateLimit(a, 1, 3600); // exhaust a
    expect(rateLimit(a, 1, 3600).ok).toBe(false);
    expect(rateLimit(b, 1, 3600).ok).toBe(true); // b unaffected
  });

  it("first hit reports remaining = limit - 1 and a future reset", () => {
    const before = Date.now();
    const r = rateLimit(uniq(), 10, 3600);
    expect(r).toMatchObject({ ok: true, remaining: 9 });
    expect(r.resetAt).toBeGreaterThan(before);
  });

  it("rateLimitHeaders surfaces remaining + reset (seconds)", () => {
    const r = rateLimit(uniq(), 10, 3600);
    const h = rateLimitHeaders(r);
    expect(h["X-RateLimit-Remaining"]).toBe(String(r.remaining));
    expect(h["X-RateLimit-Reset"]).toBe(String(Math.ceil(r.resetAt / 1000)));
  });
});
