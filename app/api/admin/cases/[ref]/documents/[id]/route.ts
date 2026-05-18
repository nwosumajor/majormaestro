import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ ref: string; id: string }> }
) {
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

  if (!SAFE_NAME.test(doc.storedAs)) {
    return NextResponse.json({ error: "Invalid stored filename." }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(UPLOAD_DIR, doc.storedAs));
  } catch {
    return NextResponse.json({ error: "Stored file is missing on disk." }, { status: 410 });
  }

  await recordAudit({
    action: "document_download",
    targetType: "UploadedDocument",
    targetId: doc.id,
    metadata: { referenceId, fileName: doc.fileName },
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
    },
  });
}
