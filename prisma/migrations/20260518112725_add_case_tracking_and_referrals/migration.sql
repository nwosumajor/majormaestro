-- AlterTable
ALTER TABLE "RecoveryComplaint" ADD COLUMN     "assignedTeam" TEXT,
ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "CaseStatusEvent" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "CaseStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "referrerName" TEXT NOT NULL,
    "referrerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStatusEvent_complaintId_idx" ON "CaseStatusEvent"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- CreateIndex
CREATE INDEX "RecoveryComplaint_referralCode_idx" ON "RecoveryComplaint"("referralCode");

-- AddForeignKey
ALTER TABLE "RecoveryComplaint" ADD CONSTRAINT "RecoveryComplaint_referralCode_fkey" FOREIGN KEY ("referralCode") REFERENCES "Referral"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusEvent" ADD CONSTRAINT "CaseStatusEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RecoveryComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
