-- AlterTable
ALTER TABLE "UploadedDocument" ADD COLUMN     "storageBackend" TEXT NOT NULL DEFAULT 'local';

-- CreateTable
CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseNote_complaintId_createdAt_idx" ON "CaseNote"("complaintId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "CaseNote" ADD CONSTRAINT "CaseNote_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RecoveryComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
