import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getObject } from "@/lib/uploads";
import type { StorageBackend } from "@/lib/uploads";

// Guardian downloads a document on their OWN scholarship. Ownership-enforced.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { id, docId } = await ctx.params;

  const doc = await db.scholarshipDocument.findFirst({
    where: { id: docId, awardId: id, award: { participant: { ownerUserId: user.id } } },
    select: { storedAs: true, storageBackend: true, fileName: true, mimeType: true },
  });
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await getObject(doc.storedAs, doc.storageBackend as StorageBackend);
  } catch {
    return NextResponse.json({ error: "Could not read the file." }, { status: 500 });
  }

  await recordAudit({ action: "gicn_scholarship_document_download_guardian", actorLabel: user.email, targetType: "ScholarshipAward", targetId: id, metadata: { docId } });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
    },
  });
}
