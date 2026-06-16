import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

function retentionDays(): number {
  const n = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 1095;
}

// Manifest (CSV) of uploaded case documents with a per-file authenticated download
// URL, so a privileged admin can back the actual files up locally BEFORE a purge.
// Defaults to the PURGE-ELIGIBLE subset (closed cases past RETENTION_DAYS); ?all=1
// lists every document. Files themselves download via the existing per-document
// endpoint (which streams from the storage backend).
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "pii.export");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const all = req.nextUrl.searchParams.get("all") === "1";
  const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";

  const docs = await db.uploadedDocument.findMany({
    where: all ? {} : { complaint: { closedAt: { lte: cutoff } } },
    orderBy: { uploadedAt: "asc" },
    take: 100_000,
    include: { complaint: { select: { referenceId: true, companyName: true, closedAt: true } } },
  });

  const csv = toCsv(
    ["referenceId", "companyName", "documentType", "fileName", "fileSizeBytes", "mimeType", "storageBackend", "uploadedAt", "caseClosedAt", "downloadUrl"],
    docs.map((d) => [
      d.complaint.referenceId,
      d.complaint.companyName,
      d.documentType,
      d.fileName,
      d.fileSize,
      d.mimeType,
      d.storageBackend,
      d.uploadedAt.toISOString(),
      d.complaint.closedAt ? d.complaint.closedAt.toISOString() : "",
      `${appUrl}/api/admin/cases/${d.complaint.referenceId}/documents/${d.id}`,
    ])
  );

  const admin = await getAdminFromRequest(req);
  await recordAudit({ action: "documents_manifest_export", actorLabel: admin?.email ?? "admin", metadata: { count: docs.length, scope: all ? "all" : "eligible" } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="documents-manifest-${all ? "all" : "eligible"}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
