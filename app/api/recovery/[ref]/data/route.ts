import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ndpa-export:${ip}`, 5, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { ref } = await ctx.params;
  const referenceId = ref.toUpperCase();
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required to verify ownership of the case." },
      { status: 400 }
    );
  }

  const complaint = await db.recoveryComplaint.findUnique({
    where: { referenceId },
    include: {
      statusEvents: { orderBy: { reachedAt: "asc" } },
      documents: {
        select: {
          id: true,
          documentType: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });

  // Always respond identically for "not found" vs "wrong email" — prevents probing
  if (!complaint || complaint.contactEmail.toLowerCase() !== email) {
    return NextResponse.json(
      { error: "No matching record found for that reference + email combination." },
      { status: 404, headers: rateLimitHeaders(rl) }
    );
  }

  await recordAudit({
    action: "data_export_request",
    actorLabel: email,
    targetType: "RecoveryComplaint",
    targetId: complaint.id,
    metadata: { referenceId, ip },
  });

  return NextResponse.json({
    referenceId: complaint.referenceId,
    submittedAt: complaint.createdAt.toISOString(),
    lastUpdatedAt: complaint.updatedAt.toISOString(),
    status: complaint.status,
    assignedTeam: complaint.assignedTeam,
    organisation: {
      companyName: complaint.companyName,
      rcNumber: complaint.rcNumber,
      turnoverBand: complaint.turnoverBand,
      banks: complaint.banks,
    },
    contact: {
      name: complaint.contactName,
      title: complaint.contactTitle,
      email: complaint.contactEmail,
      phone: complaint.contactPhone,
    },
    acknowledgments: {
      confirmedSignatory: complaint.confirmedSignatory,
      agreedNDPA: complaint.agreedNDPA,
    },
    statusHistory: complaint.statusEvents.map((e) => ({
      step: e.step,
      reachedAt: e.reachedAt.toISOString(),
      note: e.note,
    })),
    documents: complaint.documents.map((d) => ({
      ...d,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    notice:
      "This export is provided under your rights as a data subject under the Nigeria Data Protection Act (NDPA) 2023. For correction or deletion requests, contact forensics@majormaestro.com quoting this reference ID.",
  });
}
