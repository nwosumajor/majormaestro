-- AlterTable: add googleSub to AdminUser
ALTER TABLE "AdminUser" ADD COLUMN "googleSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_googleSub_key" ON "AdminUser"("googleSub");

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateTable: SavedClassification
CREATE TABLE "SavedClassification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedClassification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedClassification_userId_createdAt_idx" ON "SavedClassification"("userId", "createdAt");

ALTER TABLE "SavedClassification" ADD CONSTRAINT "SavedClassification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SavedRoadmap
CREATE TABLE "SavedRoadmap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "completedMilestones" INTEGER[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRoadmap_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedRoadmap_userId_createdAt_idx" ON "SavedRoadmap"("userId", "createdAt");

ALTER TABLE "SavedRoadmap" ADD CONSTRAINT "SavedRoadmap_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: link RecoveryComplaint to User
ALTER TABLE "RecoveryComplaint" ADD COLUMN "userId" TEXT;

CREATE INDEX "RecoveryComplaint_userId_idx" ON "RecoveryComplaint"("userId");
CREATE INDEX "RecoveryComplaint_contactEmail_idx" ON "RecoveryComplaint"("contactEmail");

ALTER TABLE "RecoveryComplaint" ADD CONSTRAINT "RecoveryComplaint_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
