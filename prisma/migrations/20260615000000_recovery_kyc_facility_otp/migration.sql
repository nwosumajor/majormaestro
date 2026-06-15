-- Recovery onboarding — Features 4 (loan/facility status) + 5 (KYC) + 2 (OTP scaffolding).
-- All RecoveryComplaint columns are nullable so existing rows remain valid
-- (backward-compatible; account-deletion/retention semantics unchanged).

-- Feature 4 — Loan / facility status
ALTER TABLE "RecoveryComplaint" ADD COLUMN "hasActiveOrPendingFacility" BOOLEAN;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "hasPriorBankDispute"        BOOLEAN;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "engagementContext"          TEXT;

-- Feature 5 — KYC: registered business address (structured) + authorized representative ID
ALTER TABLE "RecoveryComplaint" ADD COLUMN "regAddressLine1"      TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "regAddressLine2"      TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "regAddressCity"       TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "regAddressState"      TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "regAddressCountry"    TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "regAddressPostalCode" TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "representativeIdType" TEXT;       -- 'nin'|'passport'|'drivers_license'|'voters_card'
-- Reserved for future use: an ID *number* (encrypted via encryptSecret, AES-256-GCM).
-- Not captured at intake by default — only the ID document + type are. Never returned by list endpoints.
ALTER TABLE "RecoveryComplaint" ADD COLUMN "representativeIdNumberEnc" TEXT;
ALTER TABLE "RecoveryComplaint" ADD COLUMN "representativeIdLast4"     TEXT;

-- Feature 2 — contact-channel verification timestamps (OTP; logic lands in a later commit)
ALTER TABLE "RecoveryComplaint" ADD COLUMN "contactEmailVerifiedAt" TIMESTAMPTZ(3);
ALTER TABLE "RecoveryComplaint" ADD COLUMN "contactPhoneVerifiedAt" TIMESTAMPTZ(3);

-- Feature 2 — OTP challenge store (codes hashed; TTL + attempt cap enforced in app)
CREATE TABLE "OtpChallenge" (
    "id"         TEXT NOT NULL,
    "channel"    TEXT NOT NULL,                 -- 'email' | 'sms'
    "target"     TEXT NOT NULL,                 -- email or E.164 phone
    "codeHash"   TEXT NOT NULL,                 -- sha256(code)
    "expiresAt"  TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "attempts"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpChallenge_target_createdAt_idx" ON "OtpChallenge"("target", "createdAt");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- RLS: deny Supabase PostgREST roles; the app's Prisma 'postgres' role bypasses
-- (mirrors 20260607010345_enable_rls — every public table has RLS enabled).
ALTER TABLE "OtpChallenge" ENABLE ROW LEVEL SECURITY;
