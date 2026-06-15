import { createHash } from "crypto";

// Server-only (imports node:crypto — never import from a client component).
// Tamper-evident SHA-256 over the policy version + complaint identity + signer +
// timestamp, so a stored TermsAcceptance can be independently re-verified.
export interface AcknowledgementInput {
  policyVersion: string;
  referenceId: string;
  companyName: string;
  rcNumber: string;
  acceptedByName: string;
  acceptedAt: string; // ISO string
}

export function computeAcknowledgementHash(input: AcknowledgementInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
