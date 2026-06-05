import { NextResponse, type NextRequest } from "next/server";
import {
  verifyWebhook,
  claimDelivery,
  markDone,
  releaseClaim,
  SIGNATURE_HEADER,
  type VerifiedEnvelope,
} from "@/lib/webhookVerify";

/**
 * Production-ready receiver for MajorGBN outbound webhooks.
 *
 * Point a webhook in /admin/webhooks at  https://<host>/api/webhooks/inbound
 * and set GBN_WEBHOOK_RECEIVER_SECRET to that webhook's secret.
 *
 * SECURITY
 *   - HMAC-SHA256 signature verified against the RAW body (constant-time).
 *   - Fails closed when no secret is configured (503).
 *   - Body-size cap; strict envelope shape; freshness window bounds replay.
 *   - Only POST is handled — any other method returns 405 automatically.
 * COMPLIANCE (NDPA 2023)
 *   - Logs are PII-minimised: only event + reference id + status, never the
 *     company name, referrer email, or note text.
 *   - Third-party relay (Slack) is opt-in and forwards the minimum needed;
 *     the referrer email is deliberately withheld (look it up in admin).
 * RELIABILITY
 *   - Idempotent: the per-delivery signature dedupes the sender's retries.
 *   - Responds 2xx fast on success; returns 5xx on transient processing
 *     failure so the sender's backoff retry redelivers (at-least-once).
 */

export const runtime = "nodejs"; // needs node:crypto
export const dynamic = "force-dynamic";

const SLACK_TIMEOUT_MS = 3_000;

/** Reference id is a low-sensitivity internal token — safe for logs/ops alerts. */
function refOf(data: Record<string, unknown>): string {
  return typeof data.referenceId === "string" ? data.referenceId : "—";
}

function jsonError(status: number, reason: string) {
  // Generic, PII-free responses. Same body shape for all auth failures.
  return NextResponse.json({ ok: false, error: reason }, { status });
}

export async function POST(req: NextRequest) {
  const secret = process.env.GBN_WEBHOOK_RECEIVER_SECRET;

  // Read the raw body exactly once — required for a correct signature check.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonError(400, "unreadable_body");
  }

  const signature = req.headers.get(SIGNATURE_HEADER);
  const result = verifyWebhook(rawBody, signature, secret);

  if (!result.ok) {
    switch (result.reason) {
      case "secret_not_configured":
        // Misconfiguration, not the caller's fault — fail closed + alert operator.
        console.error("[webhook-inbound] GBN_WEBHOOK_RECEIVER_SECRET is not set — rejecting all deliveries.");
        return jsonError(503, "receiver_not_configured");
      case "body_too_large":
        return jsonError(413, "payload_too_large");
      case "stale":
        return jsonError(400, "stale_delivery");
      case "malformed_body":
        return jsonError(400, "malformed_body");
      case "missing_signature":
      case "bad_signature":
      default:
        // Do not distinguish missing vs wrong — avoids leaking verification detail.
        return jsonError(401, "invalid_signature");
    }
  }

  const { envelope, signature: sig } = result;

  // ── Idempotency: dedupe the sender's retries / accidental double-fires ──
  const claim = claimDelivery(sig);
  if (claim === "done") {
    return NextResponse.json({ ok: true, status: "duplicate_ignored" });
  }
  if (claim === "in_progress") {
    // Another concurrent attempt holds the lease; ack so the sender doesn't pile on.
    return NextResponse.json({ ok: true, status: "in_progress" });
  }

  try {
    await handleEvent(envelope);
    markDone(sig);
  } catch (err) {
    // Release the claim so the sender's retry can redeliver, and signal 502 so it does.
    releaseClaim(sig);
    console.error(`[webhook-inbound] processing failed event=${envelope.event} ref=${refOf(envelope.data)}:`, err);
    return jsonError(502, "processing_failed");
  }

  // PII-minimised audit line.
  console.info(
    `[webhook-inbound] ok event=${envelope.event} ref=${refOf(envelope.data)} status=${
      typeof envelope.data.newStatus === "string" ? envelope.data.newStatus : "—"
    }`
  );

  return NextResponse.json({ ok: true, status: "processed" });
}

/**
 * Business logic for a verified event. Replace/extend this with your real
 * integration (CRM upsert, accounting entry, queue publish, …).
 *
 * Default behaviour: relay a concise alert to Slack if SLACK_WEBHOOK_URL is set;
 * otherwise just acknowledge (the verified receipt is logged above).
 *
 * Throw to signal a transient failure → the route returns 502 → the sender
 * retries with backoff. Only throw for retryable failures; swallow permanent
 * ones (e.g. an event you intentionally ignore) so you don't loop forever.
 */
async function handleEvent(envelope: VerifiedEnvelope): Promise<void> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackUrl) return; // nothing to forward — receipt already verified + logged

  const text = formatSlack(envelope);
  if (!text) return; // event we don't relay

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    const res = await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Transient — let the sender retry.
      throw new Error(`slack relay returned ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Build a concise, PII-minimised Slack message. Returns null for unrelayed events. */
function formatSlack(envelope: VerifiedEnvelope): string | null {
  const d = envelope.data;
  const ref = refOf(d);
  const company = typeof d.companyName === "string" ? d.companyName : "a client";
  switch (envelope.event) {
    case "case.closed":
      return `✅ *Recovery case closed* — ${company} (${ref}).`;
    case "case.status_changed": {
      const prev = typeof d.previousStatus === "string" ? d.previousStatus : "—";
      const next = typeof d.newStatus === "string" ? d.newStatus : "—";
      return `🔄 *Case ${ref}* (${company}): \`${prev}\` → \`${next}\`.`;
    }
    case "referral.created": {
      const code = typeof d.referralCode === "string" ? d.referralCode : "—";
      // Referrer email is intentionally NOT forwarded (PII minimisation).
      return `🎯 *New referred complaint* — ${company} (${ref}) via referral \`${code}\`. Referrer details in admin.`;
    }
    case "test":
      return `🧪 MajorGBN webhook receiver test — signature verified OK.`;
    default:
      return null;
  }
}
