import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { putObject } from "@/lib/uploads";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/octet-stream",
]);
const ALLOWED_EXTS = new Set([".pdf", ".xls", ".xlsx", ".csv"]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext) && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not permitted. Upload PDF, Excel, or CSV files only." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 50 MB limit. Please split large statement files." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || `application/${ext.slice(1)}`;
    const stored = await putObject({ bytes, fileExt: ext, contentType });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storedAs: stored.key,
      storageBackend: stored.backend,
      size: file.size,
      mimeType: contentType,
    });
  } catch (err) {
    console.error("[/api/upload]", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
