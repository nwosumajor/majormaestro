-- AlterTable
ALTER TABLE "Referral" ADD COLUMN "verifiedAt" TIMESTAMPTZ(3);
ALTER TABLE "Referral" ADD COLUMN "verificationTokenHash" TEXT;
ALTER TABLE "Referral" ADD COLUMN "bankDetails" TEXT;
ALTER TABLE "Referral" ADD COLUMN "paidOutKobo" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Referral" ADD COLUMN "lastPaidAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_verificationTokenHash_key" ON "Referral"("verificationTokenHash");

-- CreateIndex
CREATE INDEX "Referral_referrerEmail_idx" ON "Referral"("referrerEmail");
