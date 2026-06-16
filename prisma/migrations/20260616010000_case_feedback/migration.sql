-- Post-recovery NPS / satisfaction feedback (one or more per case).
CREATE TABLE "CaseFeedback" (
    "id"          TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "score"       INTEGER NOT NULL,  -- NPS 0..10
    "comment"     TEXT,
    "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CaseFeedback_complaintId_idx" ON "CaseFeedback"("complaintId");
ALTER TABLE "CaseFeedback"
    ADD CONSTRAINT "CaseFeedback_complaintId_fkey"
    FOREIGN KEY ("complaintId") REFERENCES "RecoveryComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseFeedback" ENABLE ROW LEVEL SECURITY;
