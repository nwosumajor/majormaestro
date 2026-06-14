import { describe, it, expect } from "vitest";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

// Unique key per test so the shared in-memory store never bleeds across tests.
// With no Upstash env configured, rateLimit() resolves via the in-memory backend.
const uniq = () => `test:${Math.random().toString(36).slice(2)}`;

describe("rateLimit (in-memory fallback)", () => {
  it("allows up to the limit, then blocks", async () => {
    const key = uniq();
    const limit = 5;
    for (let i = 0; i < limit; i++) {
      const r = await rateLimit(key, limit, 3600);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(limit - 1 - i);
    }
    const blocked = await rateLimit(key, limit, 3600);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const a = uniq();
    const b = uniq();
    await rateLimit(a, 1, 3600); // exhaust a
    expect((await rateLimit(a, 1, 3600)).ok).toBe(false);
    expect((await rateLimit(b, 1, 3600)).ok).toBe(true); // b unaffected
  });

  it("first hit reports remaining = limit - 1 and a future reset", async () => {
    const before = Date.now();
    const r = await rateLimit(uniq(), 10, 3600);
    expect(r).toMatchObject({ ok: true, remaining: 9 });
    expect(r.resetAt).toBeGreaterThan(before);
  });

  it("rateLimitHeaders surfaces remaining + reset (seconds)", async () => {
    const r = await rateLimit(uniq(), 10, 3600);
    const h = rateLimitHeaders(r);
    expect(h["X-RateLimit-Remaining"]).toBe(String(r.remaining));
    expect(h["X-RateLimit-Reset"]).toBe(String(Math.ceil(r.resetAt / 1000)));
  });
});
