import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// Durable backend (Upstash Redis REST) — used in production so the limit is
// shared across all serverless instances and survives deploys. Falls back to
// the in-memory limiter when unconfigured or if Redis is unreachable, so the
// app never hard-fails on a rate-limit check. No SDK dependency — plain fetch
// against the Upstash REST pipeline. Also reads Vercel KV's REST env aliases.
// ---------------------------------------------------------------------------
// Accepts native Upstash names, generic Vercel KV names, and the prefixed names
// the Vercel Marketplace Upstash integration injects (e.g. MAJORMAESTRO_KV_*).
// Uses the read-WRITE token (INCR/EXPIRE need writes), never the read-only one.
const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.MAJORMAESTRO_KV_REST_API_URL ||
  "";
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.MAJORMAESTRO_KV_REST_API_TOKEN ||
  "";
const DURABLE = Boolean(REDIS_URL && REDIS_TOKEN);

/** Whether the durable (cross-instance) backend is active. Surfaced for ops/health checks. */
export const rateLimitDurable = DURABLE;

function memoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

async function durableRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const rkey = `rl:${key}`;
  // Fixed-window counter: INCR, set TTL only on the first hit (EXPIRE …NX),
  // then read the remaining TTL to report an accurate reset time — one round trip.
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", rkey],
      ["EXPIRE", rkey, String(windowSeconds), "NX"],
      ["PTTL", rkey],
    ]),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as Array<{ result?: number; error?: string }>;
  if (data[0]?.error) throw new Error(data[0].error);

  const count = Number(data[0]?.result ?? 0);
  let pttl = Number(data[2]?.result ?? -1);
  if (!Number.isFinite(pttl) || pttl < 0) pttl = windowSeconds * 1000;
  const resetAt = Date.now() + pttl;

  if (count > limit) return { ok: false, remaining: 0, resetAt };
  return { ok: true, remaining: Math.max(0, limit - count), resetAt };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (DURABLE) {
    try {
      return await durableRateLimit(key, limit, windowSeconds);
    } catch (err) {
      // Fail open to the in-memory limiter — never block legitimate traffic on
      // a transient Redis hiccup, but still apply a per-instance ceiling.
      console.error("[rateLimit] durable backend error, falling back to memory:", err);
    }
  }
  return memoryRateLimit(key, limit, windowSeconds);
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  };
}
