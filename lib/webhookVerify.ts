import { createHmac, timingSafeEqual } from "crypto";

/**
 * Receiver-side verification for MajorGBN outbound webhooks.
 *
 * Mirrors the SENDER scheme in `lib/webhooks.ts`:
 *   signature = "sha256=" + HMAC_SHA256(rawBody, secret)   (header: X-GBN-Signature)
 *   body      = { event, sentAt, data }                    (header: X-GBN-Event)
 *
 * SECURITY: always verify against the *raw* request body. Parsing + re-serialising
 * JSON can reorder keys or change whitespace and break the HMAC match.
 */

export const SIGNATURE_HEADER = "x-gbn-signature";
export const EVENT_HEADER = "x-gbn-event";

/** Reject bodies larger than this (defensive; legitimate payloads are < 4 KB). */
export const MAX_BODY_BYTES = 64 * 1024;

/**
 * Reject deliveries whose `sentAt` is older than this. Bounds replay of a
 * captured-but-valid request, while staying well clear of the sender's own
 * retry envelope (backoff sums to ~14.6h), so genuine late retries still pass.
 */
export const MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72h

export type VerifyFailure =
  | "secret_not_configured"
  | "missing_signature"
  | "bad_signature"
  | "body_too_large"
  | "malformed_body"
  | "stale";

export interface VerifiedEnvelope {
  event: string;
  sentAt: string;
  data: Record<string, unknown>;
}

export type VerifyResult =
  | { ok: true; envelope: VerifiedEnvelope; signature: string }
  | { ok: false; reason: VerifyFailure };

/** Constant-time compare of the `sha256=…` signature against a freshly computed HMAC. */
export function signatureMatches(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Length check first — timingSafeEqual throws on unequal lengths.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Full receiver gate: size → signature → shape → freshness.
 * Returns a typed failure reason (never throws on attacker-controlled input).
 */
export function verifyWebhook(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
  now: number = Date.now()
): VerifyResult {
  if (!secret) return { ok: false, reason: "secret_not_configured" };
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return { ok: false, reason: "body_too_large" };
  if (!signature) return { ok: false, reason: "missing_signature" };
  if (!signatureMatches(rawBody, signature, secret)) return { ok: false, reason: "bad_signature" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "malformed_body" };
  }
  if (parsed === null || typeof parsed !== "object") return { ok: false, reason: "malformed_body" };

  const obj = parsed as Record<string, unknown>;
  const event = obj.event;
  const sentAt = obj.sentAt;
  const data = obj.data;
  if (typeof event !== "string" || typeof sentAt !== "string" || data === null || typeof data !== "object") {
    return { ok: false, reason: "malformed_body" };
  }

  const ts = Date.parse(sentAt);
  if (Number.isNaN(ts) || now - ts > MAX_AGE_MS || ts - now > 5 * 60 * 1000 /* 5m future skew */) {
    return { ok: false, reason: "stale" };
  }

  return {
    ok: true,
    signature,
    envelope: { event, sentAt, data: data as Record<string, unknown> },
  };
}

/**
 * Idempotency guard. The per-delivery HMAC signature is stable across the
 * sender's retries (same body → same signature), so it is a perfect dedupe key.
 *
 * In-memory, TTL-bounded — mirrors `lib/rateLimit.ts`. NOTE: this resets on
 * deploy and is per-instance, so it dedupes the common cases (retries hitting
 * the same warm instance, accidental double-fires) but is not a hard global
 * guarantee. For exactly-once across instances, back this with the DB or Redis.
 */
const seen = new Map<string, number>(); // signature -> expiry epoch ms

export type ClaimResult = "fresh" | "in_progress" | "done";

/** Claim a delivery for processing. Returns whether it's new, mid-flight, or already completed. */
export function claimDelivery(signature: string, now: number = Date.now()): ClaimResult {
  // opportunistic sweep
  if (seen.size > 5000) {
    for (const [k, exp] of seen) if (exp < now) seen.delete(k);
  }
  const exp = seen.get(signature);
  if (exp !== undefined && exp > now) {
    // Marked done (positive TTL) vs in-flight (0). We store done as now+TTL, in-flight as a short lease.
    return exp - now > MAX_AGE_MS - 60_000 ? "done" : "in_progress";
  }
  // Lease for in-flight processing (short — released/upgraded by markDone/release).
  seen.set(signature, now + 60_000);
  return "fresh";
}

/** Mark a delivery fully processed so future duplicates are skipped for the freshness window. */
export function markDone(signature: string, now: number = Date.now()): void {
  seen.set(signature, now + MAX_AGE_MS);
}

/** Release a failed in-flight claim so the sender's retry can be processed. */
export function releaseClaim(signature: string): void {
  seen.delete(signature);
}
