import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Promote a waitlisted registration to confirmed — admin, gicn.manage.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const reg = await db.programRegistration.findUnique({ where: { id }, select: { id: true, status: true, checkInCode: true } });
  if (!reg) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  if (reg.status !== "WAITLISTED") return NextResponse.json({ error: "Only waitlisted registrations can be promoted." }, { status: 400 });

  await db.programRegistration.update({ where: { id }, data: { status: "APPROVED" } });
  await recordAudit({ action: "gicn_registration_promote", actorLabel: gate.admin.email, targetType: "ProgramRegistration", targetId: id, metadata: { code: reg.checkInCode } });
  return NextResponse.json({ success: true });
}
