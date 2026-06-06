-- Program: per-program approval gate
ALTER TABLE "Program" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- ProgramRegistration: review/decision metadata
ALTER TABLE "ProgramRegistration" ADD COLUMN "reviewedAt" TIMESTAMPTZ(3);
ALTER TABLE "ProgramRegistration" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "ProgramRegistration" ADD COLUMN "reviewNote" TEXT;

-- Default for new registrations is now SUBMITTED (was PENDING)
ALTER TABLE "ProgramRegistration" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- Backfill existing rows to the new vocabulary
UPDATE "ProgramRegistration" SET "status" = 'APPROVED' WHERE "status" = 'CONFIRMED';
UPDATE "ProgramRegistration" SET "status" = 'SUBMITTED' WHERE "status" = 'PENDING';
