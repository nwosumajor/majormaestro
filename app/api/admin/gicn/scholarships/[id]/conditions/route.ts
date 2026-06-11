import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Compliance conditions on an award — admin, scholarship.review.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { label?: string; note?: string };
  const label = (b.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "A condition label is required." }, { status: 400 });

  const award = await db.scholarshipAward.findUnique({ where: { id }, select: { id: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const c = await db.scholarshipCondition.create({ data: { awardId: id, label, note: b.note?.trim() || null }, select: { id: true } });
  await recordAudit({ action: "gicn_scholarship_condition_add", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { conditionId: c.id } });
  return NextResponse.json({ id: c.id }, { status: 201 });
}

// Toggle a condition met/unmet.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { conditionId?: string; met?: boolean };
  if (!b.conditionId) return NextResponse.json({ error: "conditionId is required." }, { status: 400 });

  const cond = await db.scholarshipCondition.findFirst({ where: { id: b.conditionId, awardId: id }, select: { id: true } });
  if (!cond) return NextResponse.json({ error: "Condition not found." }, { status: 404 });

  const met = b.met === true;
  await db.scholarshipCondition.update({ where: { id: cond.id }, data: { met, metAt: met ? new Date() : null, metBy: met ? gate.admin.email : null } });
  await recordAudit({ action: "gicn_scholarship_condition_toggle", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { conditionId: cond.id, met } });
  return NextResponse.json({ ok: true });
}
