import { createHash } from "crypto";

// Server-only (node:crypto). Tamper-evident SHA-256 over the bundle version +
// account-holder identity + signer + timestamp, so a stored GicnAgreementAcceptance
// can be independently re-verified.
export interface GicnAcknowledgementInput {
  bundleVersion: string;
  userId: string;
  kind: string;
  acceptedByName: string;
  acceptedAt: string; // ISO string
}

export function computeGicnAcknowledgementHash(input: GicnAcknowledgementInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
