import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { putObject, isAllowedUpload } from "@/lib/uploads";
import { rateLimit, getClientIp, rateLimitHeaders } from "@/lib/rateLimit";

// This endpoint is intentionally public — the recovery intake form uploads
// documents before the prospect signs in. It is therefore rate-limited per IP
// to prevent anonymous bucket-stuffing / storage-cost abuse. A single intake
// typically uploads a handful of files, so the window is generous.
const UPLOADS_PER_HOUR = 20;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`upload:${ip}`, UPLOADS_PER_HOUR, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate by extension (authoritative) — a spoofed MIME like
    // application/octet-stream must NOT be able to admit an executable.
    if (!isAllowedUpload(file.name)) {
      return NextResponse.json(
        { error: "File type not permitted. Upload PDF, Excel, or CSV files only." },
        { status: 400 }
      );
    }
    const ext = path.extname(file.name).toLowerCase();

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 50 MB limit. Please split large statement files." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || `application/${ext.slice(1)}`;
    const stored = await putObject({ bytes, fileExt: ext, contentType });

    return NextResponse.json(
      {
        success: true,
        fileName: file.name,
        storedAs: stored.key,
        storageBackend: stored.backend,
        size: file.size,
        mimeType: contentType,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (err) {
    console.error("[/api/upload]", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
