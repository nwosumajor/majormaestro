import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";

// GET — batch status + per-staff results. Polled by the results page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { batchId } = await params;
  const batch = await db.classificationBatch.findFirst({
    where: { id: batchId, userId: user.id }, // ownership scoping
    select: {
      id: true,
      label: true,
      status: true,
      total: true,
      completed: true,
      createdAt: true,
      classifications: {
        orderBy: { createdAt: "asc" },
        select: { id: true, staffName: true, staffRef: true, status: true, results: true, error: true },
      },
    },
  });

  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });

  return NextResponse.json({
    ...batch,
    createdAt: batch.createdAt.toISOString(),
  });
}
