// Payment provider boundary — STUBBED. The real gateway (e.g. Paystack /
// Flutterwave) is intentionally not wired yet. Sponsorships are created with
// status "pending"; this returns a placeholder reference so the flow is complete
// end-to-end without moving money.

export interface SponsorshipPaymentInput {
  sponsorshipId: string;
  amountKobo: bigint;
  sponsorEmail: string;
  sponsorName: string;
}

export interface PaymentInitResult {
  providerRef: string;
  redirectUrl: string | null;
  status: "pending";
}

/**
 * TODO(payments): integrate a real gateway here — create a checkout/charge for
 * `amountKobo`, return its `redirectUrl`, and verify via a webhook that flips the
 * Sponsorship to "confirmed". For now this is a no-op stub.
 */
export async function initiateSponsorshipPayment(input: SponsorshipPaymentInput): Promise<PaymentInitResult> {
  return { providerRef: `stub_${input.sponsorshipId}`, redirectUrl: null, status: "pending" };
}
