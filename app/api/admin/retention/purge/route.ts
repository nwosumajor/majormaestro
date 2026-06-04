import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { verifyStepUp } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { deleteObject, type StorageBackend } from "@/lib/uploads";

const DEFAULT_RETENTION_DAYS = 1095; // 3 years

function getRetentionDays(): number {
  const raw = process.env.RETENTION_DAYS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

function cutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - getRetentionDays());
  return d;
}

// GET: preview — count cases & documents eligible for purge
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "retention.purge");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const cut = cutoff();
  const [caseCount, docCount] = await Promise.all([
    db.recoveryComplaint.count({ where: { closedAt: { lte: cut } } }),
    db.uploadedDocument.count({
      where: { complaint: { closedAt: { lte: cut } } },
    }),
  ]);

  return NextResponse.json({
    retentionDays: getRetentionDays(),
    cutoff: cut.toISOString(),
    eligibleCases: caseCount,
    eligibleDocuments: docCount,
  });
}

// POST: execute — delete document blobs + UploadedDocument rows for eligible closed cases.
// Cases themselves remain (with metadata) so we keep an audit trail.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "retention.purge");
  if (gate.error) return gate.error;
  const { admin } = gate;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const su = (await req.json().catch(() => ({}))) as { stepUpCode?: string; stepUpPassword?: string };
  if (!(await verifyStepUp(admin.id, { code: su.stepUpCode, password: su.stepUpPassword }))) {
    return NextResponse.json({ error: "Re-authentication required. Enter your current 2FA code to confirm this purge." }, { status: 401 });
  }

  const cut = cutoff();
  const docs = await db.uploadedDocument.findMany({
    where: { complaint: { closedAt: { lte: cut } } },
    select: { id: true, storedAs: true, storageBackend: true, complaintId: true },
  });

  let deletedBlobs = 0;
  let failedBlobs = 0;
  for (const d of docs) {
    try {
      await deleteObject(d.storedAs, d.storageBackend as StorageBackend);
      deletedBlobs++;
    } catch (err) {
      console.error("[retention] Failed to delete blob:", d.storedAs, err);
      failedBlobs++;
    }
  }

  const { count: deletedRows } = await db.uploadedDocument.deleteMany({
    where: { id: { in: docs.map((d) => d.id) } },
  });

  await recordAudit({
    action: "retention_purge",
    actorLabel: admin.email,
    metadata: {
      retentionDays: getRetentionDays(),
      cutoff: cut.toISOString(),
      deletedDocuments: deletedRows,
      deletedBlobs,
      failedBlobs,
    },
  });

  return NextResponse.json({
    success: true,
    retentionDays: getRetentionDays(),
    deletedDocuments: deletedRows,
    deletedBlobs,
    failedBlobs,
  });
}
