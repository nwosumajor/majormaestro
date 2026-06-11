-- Scholarship Review Board & monitored scholar profiles.
-- Additive: new nullable columns on ScholarshipAward + five new child tables.
-- RLS is enabled on every new table (the app's `postgres` role has BYPASSRLS,
-- so the app is unaffected; this closes the Supabase Data-API surface, matching
-- 20260607010345_enable_rls).

-- ── ScholarshipAward: new columns ───────────────────────────────────────────
ALTER TABLE "ScholarshipAward" ADD COLUMN "reference" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "term" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "academicYear" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "conditionsSummary" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "appliedByUserId" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "payoutBankName" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "payoutAccountLast4" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "payoutAccountEncrypted" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "reviewedAt" TIMESTAMPTZ(3);
ALTER TABLE "ScholarshipAward" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "awardedBy" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "awardedAt" TIMESTAMPTZ(3);
ALTER TABLE "ScholarshipAward" ADD COLUMN "onboardingSubmittedAt" TIMESTAMPTZ(3);
ALTER TABLE "ScholarshipAward" ADD COLUMN "activatedAt" TIMESTAMPTZ(3);
ALTER TABLE "ScholarshipAward" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "ScholarshipAward" ADD COLUMN "renewalDueAt" TIMESTAMPTZ(3);
ALTER TABLE "ScholarshipAward" ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "ScholarshipAward_reference_key" ON "ScholarshipAward"("reference");
CREATE INDEX "ScholarshipAward_status_idx" ON "ScholarshipAward"("status");

-- ── ScholarshipReview ───────────────────────────────────────────────────────
CREATE TABLE "ScholarshipReview" (
  "id" TEXT NOT NULL,
  "awardId" TEXT NOT NULL,
  "reviewerEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipReview_awardId_idx" ON "ScholarshipReview"("awardId");
ALTER TABLE "ScholarshipReview" ADD CONSTRAINT "ScholarshipReview_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "ScholarshipAward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ScholarshipCondition ────────────────────────────────────────────────────
CREATE TABLE "ScholarshipCondition" (
  "id" TEXT NOT NULL,
  "awardId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "met" BOOLEAN NOT NULL DEFAULT false,
  "metAt" TIMESTAMPTZ(3),
  "metBy" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipCondition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipCondition_awardId_idx" ON "ScholarshipCondition"("awardId");
ALTER TABLE "ScholarshipCondition" ADD CONSTRAINT "ScholarshipCondition_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "ScholarshipAward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ScholarshipAcademicRecord ───────────────────────────────────────────────
CREATE TABLE "ScholarshipAcademicRecord" (
  "id" TEXT NOT NULL,
  "awardId" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "academicYear" TEXT,
  "school" TEXT,
  "classLevel" TEXT,
  "gradeOrGpa" TEXT,
  "attendancePct" INTEGER,
  "standing" TEXT NOT NULL DEFAULT 'on_track',
  "note" TEXT,
  "recordedBy" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipAcademicRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipAcademicRecord_awardId_idx" ON "ScholarshipAcademicRecord"("awardId");
ALTER TABLE "ScholarshipAcademicRecord" ADD CONSTRAINT "ScholarshipAcademicRecord_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "ScholarshipAward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ScholarshipDisbursement ─────────────────────────────────────────────────
CREATE TABLE "ScholarshipDisbursement" (
  "id" TEXT NOT NULL,
  "awardId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank',
  "reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "paidAt" TIMESTAMPTZ(3),
  "recordedBy" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipDisbursement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipDisbursement_awardId_idx" ON "ScholarshipDisbursement"("awardId");
ALTER TABLE "ScholarshipDisbursement" ADD CONSTRAINT "ScholarshipDisbursement_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "ScholarshipAward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ScholarshipDocument ─────────────────────────────────────────────────────
CREATE TABLE "ScholarshipDocument" (
  "id" TEXT NOT NULL,
  "awardId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storedAs" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storageBackend" TEXT NOT NULL DEFAULT 'local',
  "uploadedByUserId" TEXT,
  "uploadedByLabel" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScholarshipDocument_awardId_idx" ON "ScholarshipDocument"("awardId");
ALTER TABLE "ScholarshipDocument" ADD CONSTRAINT "ScholarshipDocument_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "ScholarshipAward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Row-Level Security on every new table ───────────────────────────────────
ALTER TABLE "ScholarshipReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScholarshipCondition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScholarshipAcademicRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScholarshipDisbursement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScholarshipDocument" ENABLE ROW LEVEL SECURITY;
