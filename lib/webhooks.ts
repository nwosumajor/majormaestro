import { createHmac, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const WEBHOOK_EVENTS = [
  "case.status_changed",
  "case.closed",
  "case.note_added",
  "referral.created",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const MAX_ATTEMPTS = 5;
const DELIVERY_TIMEOUT_MS = 5_000;

// Backoff schedule in minutes — applied after each failed attempt.
// Attempt 1 fails → schedule at +1m; attempt 2 fails → +5m; etc.
const BACKOFF_MINUTES = [1, 5, 30, 120, 720];

export function generateSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export interface WebhookFilter {
  minRecoveryKobo?: string;     // serialized BigInt
  statuses?: string[];          // case must be in one of these
  hasReferral?: boolean;
}

export function isValidFilter(value: unknown): value is WebhookFilter {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.minRecoveryKobo !== undefined && typeof v.minRecoveryKobo !== "string") return false;
  if (v.statuses !== undefined && (!Array.isArray(v.statuses) || v.statuses.some((s) => typeof s !== "string"))) return false;
  if (v.hasReferral !== undefined && typeof v.hasReferral !== "boolean") return false;
  return true;
}

interface CaseFilterContext {
  status?: string;
  recoveryAmountKobo?: bigint | null;
  hasReferral?: boolean;
}

function passesFilter(filter: unknown, ctx: CaseFilterContext): boolean {
  if (!filter || !isValidFilter(filter)) return true;
  if (filter.statuses && filter.statuses.length > 0) {
    if (!ctx.status || !filter.statuses.includes(ctx.status)) return false;
  }
  if (filter.minRecoveryKobo) {
    const min = BigInt(filter.minRecoveryKobo);
    if (ctx.recoveryAmountKobo == null || ctx.recoveryAmountKobo < min) return false;
  }
  if (filter.hasReferral !== undefined) {
    if ((!!ctx.hasReferral) !== filter.hasReferral) return false;
  }
  return true;
}

export interface DispatchInput {
  event: WebhookEvent;
  data: Record<string, unknown>;
  filterContext?: CaseFilterContext;
}

/**
 * Enqueue + attempt the first delivery inline. Failures schedule a retry for the cron route.
 * Always returns immediately — callers should NOT await as part of a user-facing response path.
 */
export async function dispatch(input: DispatchInput): Promise<void> {
  if (!db) return;
  const hooks = await db.webhook.findMany({
    where: { active: true, events: { has: input.event } },
  });
  if (hooks.length === 0) return;

  const eligible = hooks.filter((h) => passesFilter(h.filter, input.filterContext ?? {}));
  if (eligible.length === 0) return;

  const body = JSON.stringify({
    event: input.event,
    sentAt: new Date().toISOString(),
    data: input.data,
  });

  await Promise.all(
    eligible.map(async (hook) => {
      const signature = `sha256=${createHmac("sha256", hook.secret).update(body).digest("hex")}`;
      const delivery = await db!.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          event: input.event,
          payload: JSON.parse(body) as Prisma.InputJsonValue,
          signature,
          status: "pending",
        },
      });
      await attemptDelivery(delivery.id, hook.url, body, signature, hook.id);
    })
  );
}

interface AttemptOutcome {
  ok: boolean;
  status?: number;
  responseBody?: string;
  error?: string;
}

async function performHttp(url: string, body: string, signature: string, event: string): Promise<AttemptOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GBN-Event": event,
        "X-GBN-Signature": signature,
      },
      body,
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    if (res.ok) return { ok: true, status: res.status, responseBody: text.slice(0, 2000) };
    return { ok: false, status: res.status, responseBody: text.slice(0, 2000) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function attemptDelivery(
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
  webhookId: string
): Promise<void> {
  if (!db) return;
  const delivery = await db.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) return;
  if (delivery.status === "success" || delivery.status === "dead") return;

  const event = delivery.event;
  const outcome = await performHttp(url, body, signature, event);
  const attempts = delivery.attempts + 1;

  if (outcome.ok) {
    await db.$transaction([
      db.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "success",
          attempts,
          lastAttemptAt: new Date(),
          nextAttemptAt: null,
          responseCode: outcome.status,
          responseBody: outcome.responseBody,
        },
      }),
      db.webhook.update({
        where: { id: webhookId },
        data: { lastSentAt: new Date(), failCount: 0 },
      }),
    ]);
    return;
  }

  const isDead = attempts >= MAX_ATTEMPTS;
  const nextDelayMin = isDead ? null : BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  const nextAttemptAt = nextDelayMin == null ? null : new Date(Date.now() + nextDelayMin * 60_000);

  await db.$transaction([
    db.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: isDead ? "dead" : "pending",
        attempts,
        lastAttemptAt: new Date(),
        nextAttemptAt,
        responseCode: outcome.status,
        responseBody: outcome.responseBody ?? outcome.error,
      },
    }),
    db.webhook.update({
      where: { id: webhookId },
      data: { failCount: { increment: 1 } },
    }),
  ]);
}

/**
 * Re-attempt every pending delivery whose nextAttemptAt has elapsed.
 * Designed to be called by a scheduled cron route every few minutes.
 */
export async function processRetries(): Promise<{ processed: number; succeeded: number; failed: number; dead: number }> {
  if (!db) return { processed: 0, succeeded: 0, failed: 0, dead: 0 };
  const due = await db.webhookDelivery.findMany({
    where: {
      status: "pending",
      nextAttemptAt: { lte: new Date() },
    },
    include: { webhook: true },
    take: 100,
  });

  let succeeded = 0, failed = 0, dead = 0;
  for (const d of due) {
    const body = JSON.stringify(d.payload);
    await attemptDelivery(d.id, d.webhook.url, body, d.signature, d.webhookId);
    const updated = await db.webhookDelivery.findUnique({ where: { id: d.id }, select: { status: true } });
    if (updated?.status === "success") succeeded++;
    else if (updated?.status === "dead") dead++;
    else failed++;
  }

  return { processed: due.length, succeeded, failed, dead };
}

/** Used by the test-fire endpoint to send a synthetic event. */
export async function dispatchTest(webhookId: string): Promise<void> {
  if (!db) return;
  const hook = await db.webhook.findUnique({ where: { id: webhookId } });
  if (!hook) throw new Error("Webhook not found.");
  const body = JSON.stringify({
    event: "test",
    sentAt: new Date().toISOString(),
    data: {
      message: "This is a synthetic test event from the MajorGBN admin panel.",
      webhookId: hook.id,
      label: hook.label,
    },
  });
  const signature = `sha256=${createHmac("sha256", hook.secret).update(body).digest("hex")}`;
  const delivery = await db.webhookDelivery.create({
    data: {
      webhookId: hook.id,
      event: "test",
      payload: JSON.parse(body) as Prisma.InputJsonValue,
      signature,
      status: "pending",
    },
  });
  await attemptDelivery(delivery.id, hook.url, body, signature, hook.id);
}
