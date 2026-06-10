import { NextResponse, after, type NextRequest } from "next/server";
import { verifyPaystackSignature, isPaymentConfigured } from "@/lib/payments";
import { confirmSponsorshipByReference } from "@/lib/sponsorship";
import { sendSponsorshipConfirmation } from "@/lib/email";

/**
 * Paystack webhook receiver for GICN sponsorships.
 *
 * Configure in the Paystack dashboard:
 *   Webhook URL = https://<host>/api/gicn/sponsor/webhook
 *
 * SECURITY
 *   - HMAC-SHA512 of the RAW body verified against x-paystack-signature
 *     (constant-time). Fails closed when PAYSTACK_SECRET_KEY is unset (503).
 *   - The body is never trusted for fulfilment: confirmSponsorshipByReference
 *     re-verifies the transaction with Paystack and checks the amount before
 *     granting value (idempotent pending → paid).
 * RELIABILITY
 *   - Responds 200 fast; Paystack retries on non-2xx, and our flip is
 *     idempotent so retries are safe.
 */
export const runtime = "nodejs"; // node:crypto
export const dynamic = "force-dynamic";

const SIGNATURE_HEADER = "x-paystack-signature";

export async function POST(req: NextRequest) {
  if (!isPaymentConfigured()) {
    console.error("[paystack-webhook] PAYSTACK_SECRET_KEY not set — rejecting.");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "unreadable_body" }, { status: 400 });
  }

  const signature = req.headers.get(SIGNATURE_HEADER);
  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "malformed_body" }, { status: 400 });
  }

  const reference = event?.data?.reference;
  // Only charge.success grants value; acknowledge everything else with 200.
  if (event?.event !== "charge.success" || typeof reference !== "string") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await confirmSponsorshipByReference(reference);
    if (result.justConfirmed && result.email) {
      const e = result.email;
      after(() =>
        sendSponsorshipConfirmation({ ...e, paid: true }).catch((err) =>
          console.error("[paystack-webhook] confirmation email error:", err)
        )
      );
    }
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (err) {
    // 5xx → Paystack retries (idempotent), so a transient failure self-heals.
    console.error("[paystack-webhook] processing error:", err);
    return NextResponse.json({ ok: false, error: "processing_error" }, { status: 500 });
  }
}
