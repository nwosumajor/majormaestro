import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { isProgramType, isProgramStatus } from "@/lib/gicn";

// Update a programme (status, capacity, details) — admin, gicn.manage.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const existing = await db.program.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.title === "string" && b.title.trim()) data.title = b.title.trim();
  if (typeof b.description === "string") data.description = b.description.trim() || null;
  if (typeof b.location === "string") data.location = b.location.trim() || null;
  if (typeof b.type === "string" && isProgramType(b.type)) data.type = b.type;
  if (typeof b.status === "string" && isProgramStatus(b.status)) data.status = b.status;
  if (typeof b.startsAt === "string") { const d = new Date(b.startsAt); if (!isNaN(d.getTime())) data.startsAt = d; }
  if (typeof b.endsAt === "string") { const d = new Date(b.endsAt); if (!isNaN(d.getTime())) data.endsAt = d; }
  if (b.capacity === null || b.capacity === "") data.capacity = null;
  else if (b.capacity != null) {
    const c = Number(b.capacity);
    if (!Number.isInteger(c) || c < 0) return NextResponse.json({ error: "Capacity must be a non-negative whole number." }, { status: 400 });
    data.capacity = c;
  }

  await db.program.update({ where: { id }, data });
  await recordAudit({ action: "gicn_program_update", actorLabel: gate.admin.email, targetType: "Program", targetId: id, metadata: { fields: Object.keys(data) } });
  return NextResponse.json({ success: true });
}

// Delete a programme (cascades registrations + awards) — admin, gicn.manage.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const existing = await db.program.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

  await db.program.delete({ where: { id } });
  await recordAudit({ action: "gicn_program_delete", actorLabel: gate.admin.email, targetType: "Program", targetId: id, metadata: { title: existing.title } });
  return NextResponse.json({ success: true });
}
