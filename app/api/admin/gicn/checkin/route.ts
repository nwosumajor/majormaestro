import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Check a participant in by scanning/typing their check-in code, or by id.
// Admin, gicn.checkin. Idempotent — re-checking returns the existing time.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.checkin");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as { checkInCode?: string; registrationId?: string };
  const code = (b.checkInCode ?? "").trim().toUpperCase();
  const where = b.registrationId ? { id: b.registrationId } : code ? { checkInCode: code } : null;
  if (!where) return NextResponse.json({ error: "Provide a check-in code." }, { status: 400 });

  const reg = await db.programRegistration.findUnique({
    where,
    select: { id: true, status: true, checkedInAt: true, checkInCode: true, participant: { select: { fullName: true } }, program: { select: { title: true } } },
  });
  if (!reg) return NextResponse.json({ error: "No registration found for that code." }, { status: 404 });
  if (reg.status === "CANCELLED") return NextResponse.json({ error: "That registration was cancelled." }, { status: 409 });

  if (reg.checkedInAt) {
    return NextResponse.json({
      alreadyCheckedIn: true,
      participantName: reg.participant.fullName,
      programTitle: reg.program.title,
      checkedInAt: reg.checkedInAt.toISOString(),
    });
  }

  // Checking in implies presence — promote a waitlisted participant to confirmed.
  const updated = await db.programRegistration.update({
    where: { id: reg.id },
    data: { checkedInAt: new Date(), status: reg.status === "WAITLISTED" ? "CONFIRMED" : reg.status },
    select: { checkedInAt: true },
  });

  await recordAudit({ action: "gicn_checkin", actorLabel: gate.admin.email, targetType: "ProgramRegistration", targetId: reg.id, metadata: { code: reg.checkInCode } });

  return NextResponse.json({
    success: true,
    participantName: reg.participant.fullName,
    programTitle: reg.program.title,
    checkedInAt: updated.checkedInAt!.toISOString(),
  });
}
