-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- AlterTable
ALTER TABLE "RecoveryComplaint" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "findingsSummary" TEXT,
ADD COLUMN     "recoveryAmountKobo" BIGINT;

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "events" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_actorLabel_idx" ON "AuditLog"("actorLabel");

-- CreateIndex
CREATE INDEX "RecoveryComplaint_status_idx" ON "RecoveryComplaint"("status");

-- CreateIndex
CREATE INDEX "RecoveryComplaint_createdAt_idx" ON "RecoveryComplaint"("createdAt");

-- CreateIndex
CREATE INDEX "RecoveryComplaint_closedAt_idx" ON "RecoveryComplaint"("closedAt");
