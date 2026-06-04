import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  const gate = await requireAdmin(req, "cases.read");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { ref } = await ctx.params;
  const referenceId = ref.toUpperCase();

  const complaint = await db.recoveryComplaint.findUnique({
    where: { referenceId },
    include: {
      statusEvents: { orderBy: { reachedAt: "asc" } },
      documents: { orderBy: { uploadedAt: "asc" } },
      referral: true,
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...complaint,
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
    statusEvents: complaint.statusEvents.map((e) => ({
      ...e,
      reachedAt: e.reachedAt.toISOString(),
    })),
    documents: complaint.documents.map((d) => ({
      ...d,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    referral: complaint.referral
      ? { ...complaint.referral, createdAt: complaint.referral.createdAt.toISOString() }
      : null,
  });
}
