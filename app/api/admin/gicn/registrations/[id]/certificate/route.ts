import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { renderGicnCertificate } from "@/lib/pdf";

// Issue a participation certificate PDF for a registration — admin, gicn.manage.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const reg = await db.programRegistration.findUnique({
    where: { id },
    select: { id: true, participant: { select: { fullName: true } }, program: { select: { title: true, endsAt: true } } },
  });
  if (!reg) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

  const pdf = await renderGicnCertificate({
    participantName: reg.participant.fullName,
    programTitle: reg.program.title,
    variant: "participation",
    dateLabel: reg.program.endsAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
  });

  await recordAudit({ action: "gicn_certificate_issue", actorLabel: gate.admin.email, targetType: "ProgramRegistration", targetId: id });

  const safe = reg.participant.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="gicn-certificate-${safe}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
