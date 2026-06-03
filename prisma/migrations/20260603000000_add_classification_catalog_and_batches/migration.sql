-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "industryCategory" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "description" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "selectedPositionIds" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClassificationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffClassification" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffRef" TEXT,
    "inputAttributes" JSONB NOT NULL,
    "results" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");

-- CreateIndex
CREATE INDEX "Position_industryCategory_idx" ON "Position"("industryCategory");

-- CreateIndex
CREATE INDEX "ClassificationBatch_userId_createdAt_idx" ON "ClassificationBatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassificationBatch_status_idx" ON "ClassificationBatch"("status");

-- CreateIndex
CREATE INDEX "StaffClassification_batchId_idx" ON "StaffClassification"("batchId");

-- CreateIndex
CREATE INDEX "StaffClassification_status_idx" ON "StaffClassification"("status");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationBatch" ADD CONSTRAINT "ClassificationBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffClassification" ADD CONSTRAINT "StaffClassification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ClassificationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
