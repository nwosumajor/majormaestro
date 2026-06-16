import { Client, Receiver } from "@upstash/qstash";

// QStash integration for prompt, backoff-accurate webhook retries. Graceful no-op
// when unconfigured (the daily cron remains the backstop). Region/token/signing
// keys come from env (set in Vercel); secrets never live in the repo.

const TOKEN = process.env.QSTASH_TOKEN || "";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";
const RETRY_PATH = "/api/qstash/webhook-retry";

export function qstashConfigured(): boolean {
  return Boolean(TOKEN && BASE_URL);
}

let client: Client | null = null;
function getClient(): Client | null {
  if (!TOKEN) return null;
  if (!client) client = new Client({ token: TOKEN, ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}) });
  return client;
}

// Ask QStash to call our retry endpoint after `delaySeconds`. Used to trigger a
// webhook re-attempt exactly at its backoff time, instead of waiting for cron.
export async function scheduleWebhookRetry(delaySeconds: number): Promise<void> {
  const c = getClient();
  if (!c || !BASE_URL) return;
  try {
    await c.publishJSON({
      url: `${BASE_URL}${RETRY_PATH}`,
      body: { trigger: "webhook-retry" },
      delay: Math.max(0, Math.round(delaySeconds)),
    });
  } catch (err) {
    console.error("[qstash] scheduleWebhookRetry error (cron will backstop):", err);
  }
}

const receiver =
  process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;

// Verify an inbound QStash callback (Upstash-Signature header). Returns false if
// signing keys aren't configured or the signature is invalid — never throws.
export async function verifyQstashSignature(signature: string | null, body: string): Promise<boolean> {
  if (!receiver || !signature) return false;
  try {
    return await receiver.verify({ signature, body, url: `${BASE_URL}${RETRY_PATH}` });
  } catch {
    return false;
  }
}
