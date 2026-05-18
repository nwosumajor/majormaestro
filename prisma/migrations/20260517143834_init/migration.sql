-- CreateTable
CREATE TABLE "RecoveryComplaint" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "rcNumber" TEXT NOT NULL,
    "turnoverBand" TEXT NOT NULL,
    "banks" TEXT[],
    "contactName" TEXT NOT NULL,
    "contactTitle" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "confirmedSignatory" BOOLEAN NOT NULL,
    "agreedNDPA" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedAs" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadMagnetSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadMagnetSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryComplaint_referenceId_key" ON "RecoveryComplaint"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadMagnetSubscriber_email_key" ON "LeadMagnetSubscriber"("email");

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "RecoveryComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
