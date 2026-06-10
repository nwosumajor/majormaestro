-- Paystack integration for GICN sponsorships, with idempotency to make the
-- checkout safe against double-submits and network retries.
--
-- Additive + safe: all new columns are nullable. Postgres permits multiple
-- NULLs under a UNIQUE index, so existing rows (these columns IS NULL) are
-- unaffected.

ALTER TABLE "Sponsorship" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Sponsorship" ADD COLUMN "reference" TEXT;
ALTER TABLE "Sponsorship" ADD COLUMN "providerRef" TEXT;
ALTER TABLE "Sponsorship" ADD COLUMN "authorizationUrl" TEXT;
ALTER TABLE "Sponsorship" ADD COLUMN "paidAt" TIMESTAMPTZ(3);

-- Unique on the idempotency key: a concurrent double-submit hits this constraint,
-- and the app re-reads the winning row instead of creating a second checkout.
CREATE UNIQUE INDEX "Sponsorship_idempotencyKey_key" ON "Sponsorship"("idempotencyKey");
CREATE UNIQUE INDEX "Sponsorship_reference_key" ON "Sponsorship"("reference");
