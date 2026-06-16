-- GICN formal registration + legal agreements + participant emergency contact.
-- Additive, nullable columns so existing rows remain valid.

-- GicnProfile: formal account-holder details (guardian + school partner)
ALTER TABLE "GicnProfile" ADD COLUMN "fullName"             TEXT;  -- registrant legal name
ALTER TABLE "GicnProfile" ADD COLUMN "relationshipToChild"  TEXT;  -- guardian: mother|father|legal_guardian|other
ALTER TABLE "GicnProfile" ADD COLUMN "contactPersonName"    TEXT;  -- school rep
ALTER TABLE "GicnProfile" ADD COLUMN "contactPersonRole"    TEXT;  -- school rep role
ALTER TABLE "GicnProfile" ADD COLUMN "contactEmail"         TEXT;  -- school official email
ALTER TABLE "GicnProfile" ADD COLUMN "safeguardingLeadName"    TEXT;  -- school
ALTER TABLE "GicnProfile" ADD COLUMN "safeguardingLeadContact" TEXT;  -- school
ALTER TABLE "GicnProfile" ADD COLUMN "addressLine"          TEXT;
ALTER TABLE "GicnProfile" ADD COLUMN "city"                 TEXT;
ALTER TABLE "GicnProfile" ADD COLUMN "state"                TEXT;
ALTER TABLE "GicnProfile" ADD COLUMN "country"              TEXT;

-- Participant: emergency contact (child-level, recommended)
ALTER TABLE "Participant" ADD COLUMN "emergencyContactName"  TEXT;
ALTER TABLE "Participant" ADD COLUMN "emergencyContactPhone" TEXT;

-- Tamper-evident acceptance of the versioned GICN agreement bundle
CREATE TABLE "GicnAgreementAcceptance" (
    "id"                   TEXT NOT NULL,
    "gicnProfileId"        TEXT NOT NULL,
    "userId"               TEXT,
    "kind"                 TEXT NOT NULL,              -- guardian | school
    "bundleVersion"        TEXT NOT NULL,
    "acceptedTerms"        BOOLEAN NOT NULL DEFAULT false,
    "acceptedPrivacy"      BOOLEAN NOT NULL DEFAULT false,
    "acceptedSafeguarding" BOOLEAN NOT NULL DEFAULT false,
    "acceptedIndemnity"    BOOLEAN NOT NULL DEFAULT false,
    "acceptedByName"       TEXT NOT NULL,
    "acceptedByRole"       TEXT,
    "ipAddress"            TEXT,
    "userAgent"            TEXT,
    "acknowledgementHash"  TEXT NOT NULL,
    "acceptedAt"           TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GicnAgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GicnAgreementAcceptance_gicnProfileId_idx" ON "GicnAgreementAcceptance"("gicnProfileId");
CREATE INDEX "GicnAgreementAcceptance_userId_idx" ON "GicnAgreementAcceptance"("userId");

ALTER TABLE "GicnAgreementAcceptance"
    ADD CONSTRAINT "GicnAgreementAcceptance_gicnProfileId_fkey"
    FOREIGN KEY ("gicnProfileId") REFERENCES "GicnProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GicnAgreementAcceptance"
    ADD CONSTRAINT "GicnAgreementAcceptance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: deny Supabase PostgREST roles; Prisma 'postgres' role bypasses.
ALTER TABLE "GicnAgreementAcceptance" ENABLE ROW LEVEL SECURITY;
