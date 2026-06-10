// Payment provider boundary — Paystack (NGN, kobo-native).
//
// Pure provider I/O + signature verification: no database access lives here
// (the DB-confirm orchestration is in lib/sponsorship.ts so this stays a thin,
// testable gateway). When PAYSTACK_SECRET_KEY is unset the module degrades
// gracefully to a no-op "pending" stub so dev/build and the pledge flow still
// work without moving money.
//
// Docs: https://paystack.com/docs/api/transaction/

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

/** Read the secret at call-time (robust to runtime env injection + testable). */
function secret(): string | undefined {
  return process.env.PAYSTACK_SECRET_KEY;
}

/** True when a real Paystack secret key is configured. */
export function isPaymentConfigured(): boolean {
  const s = secret();
  return typeof s === "string" && s.startsWith("sk_");
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";
}

/**
 * A fresh, unique, Paystack-safe transaction reference (alphanumeric + hyphen).
 * Generated once per sponsorship and reused on every retry — Paystack treats a
 * reference as idempotent, so re-initialising with it never double-charges.
 */
export function newSponsorshipReference(): string {
  return `gicn-${randomUUID()}`;
}

export interface SponsorshipPaymentInput {
  /** Caller-owned, pre-persisted reference (reused on retries). */
  reference: string;
  sponsorshipId: string;
  amountKobo: bigint;
  sponsorEmail: string;
  sponsorName: string;
}

export interface PaymentInitResult {
  /** Our unique transaction reference — persist on the Sponsorship row. */
  reference: string;
  /** Paystack access code (reconciliation), or a stub token when unconfigured. */
  providerRef: string;
  /** Hosted-checkout URL to redirect the sponsor to, or null when unconfigured. */
  redirectUrl: string | null;
  status: "pending";
  configured: boolean;
}

/**
 * Initialise a Paystack transaction for `amountKobo` and return the hosted
 * checkout URL. Falls back to a no-op stub (redirectUrl: null) when Paystack
 * is not configured, so the pledge flow degrades gracefully.
 */
export async function initiateSponsorshipPayment(input: SponsorshipPaymentInput): Promise<PaymentInitResult> {
  const reference = input.reference;

  if (!isPaymentConfigured()) {
    return { reference, providerRef: `stub_${input.sponsorshipId}`, redirectUrl: null, status: "pending", configured: false };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.sponsorEmail,
      amount: Number(input.amountKobo), // kobo
      currency: "NGN",
      reference,
      callback_url: `${appUrl()}/gicn/sponsor/complete`,
      metadata: { sponsorshipId: input.sponsorshipId, sponsorName: input.sponsorName },
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | { status: boolean; message?: string; data?: { authorization_url: string; access_code: string; reference: string } }
    | null;

  if (!res.ok || !json?.status || !json.data?.authorization_url) {
    throw new Error(`Paystack initialize failed (${res.status}): ${json?.message ?? "unknown error"}`);
  }

  return {
    reference: json.data.reference || reference,
    providerRef: json.data.access_code,
    redirectUrl: json.data.authorization_url,
    status: "pending",
    configured: true,
  };
}

export interface VerifyResult {
  ok: boolean;
  /** Paystack transaction status: success | failed | abandoned | ... */
  status: string;
  amountKobo: number;
  currency: string;
  providerRef: string | null;
  paidAt: Date | null;
}

/**
 * Verify a transaction with Paystack (the authoritative source of truth — call
 * this before granting any value, even after a signed webhook).
 */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  if (!isPaymentConfigured()) return { ok: false, status: "unconfigured", amountKobo: 0, currency: "NGN", providerRef: null, paidAt: null };

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as
    | { status: boolean; data?: { status: string; amount: number; currency: string; id?: number; paid_at?: string | null } }
    | null;

  if (!res.ok || !json?.status || !json.data) {
    return { ok: false, status: "verify_failed", amountKobo: 0, currency: "NGN", providerRef: null, paidAt: null };
  }
  const d = json.data;
  return {
    ok: true,
    status: d.status,
    amountKobo: d.amount,
    currency: d.currency,
    providerRef: d.id != null ? String(d.id) : null,
    paidAt: d.paid_at ? new Date(d.paid_at) : null,
  };
}

/**
 * Verify a Paystack webhook signature: HMAC-SHA512 of the RAW body with the
 * secret key, constant-time compared to the `x-paystack-signature` header.
 * Fails closed when the secret is missing.
 */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const s = secret();
  if (!s || !signature) return false;
  const expected = createHmac("sha512", s).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
