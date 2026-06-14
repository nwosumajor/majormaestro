import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { parseUpload, processClassificationQueue } from "@/lib/bulkClassify";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Conservative: bulk jobs are expensive (AI per row).
  const rl = await rateLimit(`bulk-classify:${user.id}`, 3, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Bulk upload limit reached (3/hour). Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5 MB limit." }, { status: 400 });
  }
  if (!/\.(xlsx|csv)$/i.test(file.name)) {
    return NextResponse.json({ error: "Upload an .xlsx or .csv file." }, { status: 400 });
  }

  // Selected target positions (constrain the classifier). Accept JSON array or CSV string.
  const raw = form.get("positionIds");
  let requestedIds: string[] = [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      requestedIds = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      requestedIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (requestedIds.length === 0) {
    return NextResponse.json({ error: "Select at least one target position." }, { status: 400 });
  }

  // Keep only positions in this user's hybrid catalog (system or their own).
  const validPositions = await db.position.findMany({
    where: { id: { in: requestedIds }, OR: [{ userId: null }, { userId: user.id }] },
    select: { id: true },
  });
  const selectedPositionIds = validPositions.map((p) => p.id);
  if (selectedPositionIds.length === 0) {
    return NextResponse.json({ error: "None of the selected positions are valid." }, { status: 400 });
  }

  // Parse + row-validate (malformed rows rejected with reasons, batch not failed).
  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, rejected, missingColumns } = await parseUpload(buffer, file.name);

  if (missingColumns.length) {
    return NextResponse.json(
      { error: `Missing required column(s): ${missingColumns.join(", ")}. Use the provided template.` },
      { status: 400 }
    );
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid staff rows found.", rejected },
      { status: 400 }
    );
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS}).` }, { status: 400 });
  }

  // Persist as a job: batch(pending) + one StaffClassification(pending) per valid row.
  const batch = await db.classificationBatch.create({
    data: {
      userId: user.id,
      label: file.name,
      status: "pending",
      total: rows.length,
      completed: 0,
      selectedPositionIds,
      classifications: {
        create: rows.map((r) => ({
          staffName: r.staffName,
          staffRef: r.staffRef,
          inputAttributes: r.input as unknown as Prisma.InputJsonValue,
          status: "pending",
        })),
      },
    },
    select: { id: true },
  });

  await recordAudit({
    action: "bulk_classify.create",
    actorLabel: user.email,
    targetType: "ClassificationBatch",
    targetId: batch.id,
    metadata: { total: rows.length, rejected: rejected.length, positions: selectedPositionIds.length },
  });

  // Kick processing immediately (survives response flush); cron drains any remainder.
  after(() =>
    processClassificationQueue({ batchId: batch.id }).catch((e) =>
      console.error("[bulk-classify] immediate processing error:", e)
    )
  );

  return NextResponse.json(
    { batchId: batch.id, accepted: rows.length, rejected },
    { status: 201, headers: rateLimitHeaders(rl) }
  );
}
