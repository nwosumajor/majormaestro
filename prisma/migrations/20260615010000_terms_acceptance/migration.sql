-- Feature 1 — durable, tamper-evident Terms & Data-Protection acceptance.
-- One acceptance per complaint (created in the same transaction as the complaint),
-- so a RecoveryComplaint can never exist without its acceptance record.

CREATE TABLE "TermsAcceptance" (
    "id"                  TEXT NOT NULL,
    "recoveryComplaintId" TEXT NOT NULL,
    "userId"              TEXT,
    "policyVersion"       TEXT NOT NULL,
    "acceptedByName"      TEXT NOT NULL,
    "acceptedByTitle"     TEXT,
    "signatureType"       TEXT NOT NULL DEFAULT 'typed_signature', -- 'typed_signature' | 'checkbox_attestation'
    "ipAddress"           TEXT,
    "userAgent"           TEXT,
    "acknowledgementHash" TEXT NOT NULL,                            -- sha256 over version + complaint identity + signer + acceptedAt
    "acceptedAt"          TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- One acceptance per complaint.
CREATE UNIQUE INDEX "TermsAcceptance_recoveryComplaintId_key" ON "TermsAcceptance"("recoveryComplaintId");
CREATE INDEX "TermsAcceptance_userId_idx" ON "TermsAcceptance"("userId");

ALTER TABLE "TermsAcceptance"
    ADD CONSTRAINT "TermsAcceptance_recoveryComplaintId_fkey"
    FOREIGN KEY ("recoveryComplaintId") REFERENCES "RecoveryComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mirrors RecoveryComplaint: on account deletion the user link is nulled, the
-- acceptance row (like the complaint) is preserved for legal/retention purposes.
ALTER TABLE "TermsAcceptance"
    ADD CONSTRAINT "TermsAcceptance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: deny Supabase PostgREST roles; the app's Prisma 'postgres' role bypasses.
ALTER TABLE "TermsAcceptance" ENABLE ROW LEVEL SECURITY;
