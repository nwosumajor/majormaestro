import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { renderCaseReport } from "@/lib/pdf";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  const gate = await requireAdmin(req, "cases.read");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { ref } = await ctx.params;
  const referenceId = ref.toUpperCase();
  const admin = await getAdminFromRequest(req);

  const complaint = await db.recoveryComplaint.findUnique({
    where: { referenceId },
    include: {
      statusEvents: { orderBy: { reachedAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!complaint) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const pdf = await renderCaseReport(
    {
      referenceId: complaint.referenceId,
      companyName: complaint.companyName,
      rcNumber: complaint.rcNumber,
      turnoverBand: complaint.turnoverBand,
      banks: complaint.banks,
      contactName: complaint.contactName,
      contactTitle: complaint.contactTitle,
      contactEmail: complaint.contactEmail,
      contactPhone: complaint.contactPhone,
      status: complaint.status,
      assignedTeam: complaint.assignedTeam,
      createdAt: complaint.createdAt,
      closedAt: complaint.closedAt,
      findingsSummary: complaint.findingsSummary,
      recoveryAmountKobo: complaint.recoveryAmountKobo,
      statusEvents: complaint.statusEvents,
      notes: complaint.notes,
      documents: complaint.documents,
    },
    { includeInternalNotes: true }
  );

  await recordAudit({
    action: "case_report_pdf",
    actorLabel: admin?.email ?? "admin",
    targetType: "RecoveryComplaint",
    targetId: complaint.id,
    metadata: { referenceId },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${referenceId}-case-report.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
