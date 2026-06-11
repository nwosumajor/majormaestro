import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getObject } from "@/lib/uploads";
import type { StorageBackend } from "@/lib/uploads";

// Download a scholar document — admin, scholarship.review. Audited.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id, docId } = await ctx.params;

  const doc = await db.scholarshipDocument.findFirst({
    where: { id: docId, awardId: id },
    select: { storedAs: true, storageBackend: true, fileName: true, mimeType: true },
  });
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await getObject(doc.storedAs, doc.storageBackend as StorageBackend);
  } catch {
    return NextResponse.json({ error: "Could not read the file." }, { status: 500 });
  }

  await recordAudit({ action: "gicn_scholarship_document_download", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { docId } });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
    },
  });
}
