import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getObject, type StorageBackend } from "@/lib/uploads";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string; id: string }> }
) {
  const gate = await requireAdmin(req, "pii.download");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { ref, id } = await ctx.params;
  const referenceId = ref.toUpperCase();

  const doc = await db.uploadedDocument.findUnique({
    where: { id },
    include: { complaint: { select: { referenceId: true, id: true } } },
  });

  if (!doc || doc.complaint.referenceId !== referenceId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await getObject(doc.storedAs, doc.storageBackend as StorageBackend);
  } catch (err) {
    console.error("[document-download]", err);
    return NextResponse.json({ error: "Stored file is missing or unreadable." }, { status: 410 });
  }

  const admin = await getAdminFromRequest(req);
  await recordAudit({
    action: "document_download",
    actorLabel: admin?.email ?? "admin",
    targetType: "UploadedDocument",
    targetId: doc.id,
    metadata: { referenceId, fileName: doc.fileName, storageBackend: doc.storageBackend },
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
    },
  });
}
