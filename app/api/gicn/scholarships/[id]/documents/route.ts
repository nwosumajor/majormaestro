import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { putObject, isAllowedUpload } from "@/lib/uploads";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const DOC_TYPES = new Set(["admission_letter", "results", "id_card", "birth_certificate", "other"]);

// Guardian uploads a supporting document to their own scholarship. Authenticated
// + ownership-enforced (not the public upload endpoint); extension-validated.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(`gicn-scholar-doc:${getClientIp(req)}`, 30, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });

  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const award = await db.scholarshipAward.findFirst({ where: { id, participant: { ownerUserId: user.id } }, select: { id: true, status: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!["awarded", "onboarding", "active"].includes(award.status)) {
    return NextResponse.json({ error: "Documents can be uploaded once the scholarship is awarded." }, { status: 409 });
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = form.get("file") as File | null;
  const documentType = String(form.get("documentType") ?? "other");
  if (!file || file.size === 0) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!isAllowedUpload(file.name)) return NextResponse.json({ error: "File type not permitted. Upload PDF, Excel, or CSV files only." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File exceeds the 25 MB limit." }, { status: 400 });
  const docType = DOC_TYPES.has(documentType) ? documentType : "other";

  const ext = path.extname(file.name).toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || `application/${ext.slice(1)}`;
  const stored = await putObject({ bytes, fileExt: ext, contentType });

  const doc = await db.scholarshipDocument.create({
    data: {
      awardId: id, documentType: docType, fileName: file.name, storedAs: stored.key,
      fileSize: file.size, mimeType: contentType, storageBackend: stored.backend,
      uploadedByUserId: user.id, uploadedByLabel: user.email,
    },
    select: { id: true },
  });
  await recordAudit({ action: "gicn_scholarship_document_upload", actorLabel: user.email, targetType: "ScholarshipAward", targetId: id, metadata: { docId: doc.id, documentType: docType } });

  return NextResponse.json({ id: doc.id }, { status: 201, headers: rateLimitHeaders(rl) });
}
