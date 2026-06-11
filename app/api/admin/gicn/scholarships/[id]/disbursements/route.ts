import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const METHODS = new Set(["bank", "cash", "paystack"]);
const STATUSES = new Set(["scheduled", "paid", "failed", "cancelled"]);

// Manual disbursement ledger — admin, scholarship.disburse.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.disburse");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { label?: string; amountNgn?: number; method?: string; reference?: string; note?: string };
  const label = (b.label ?? "").trim();
  const amountNgn = Number(b.amountNgn);
  if (!label) return NextResponse.json({ error: "A disbursement label is required." }, { status: 400 });
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) return NextResponse.json({ error: "A valid amount (₦) is required." }, { status: 400 });
  const method = b.method && METHODS.has(b.method) ? b.method : "bank";

  const award = await db.scholarshipAward.findUnique({ where: { id }, select: { id: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const d = await db.scholarshipDisbursement.create({
    data: { awardId: id, label, amountKobo: BigInt(Math.round(amountNgn * 100)), method, reference: b.reference?.trim() || null, note: b.note?.trim() || null, status: "scheduled", recordedBy: gate.admin.email },
    select: { id: true },
  });
  await recordAudit({ action: "gicn_scholarship_disbursement_add", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { disbursementId: d.id, amountKobo: BigInt(Math.round(amountNgn * 100)).toString() } });
  return NextResponse.json({ id: d.id }, { status: 201 });
}

// Update a disbursement's status (mark paid / cancelled / failed).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.disburse");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { disbursementId?: string; status?: string };
  if (!b.disbursementId || !b.status || !STATUSES.has(b.status)) return NextResponse.json({ error: `status must be one of: ${[...STATUSES].join(", ")}.` }, { status: 400 });

  const d = await db.scholarshipDisbursement.findFirst({ where: { id: b.disbursementId, awardId: id }, select: { id: true } });
  if (!d) return NextResponse.json({ error: "Disbursement not found." }, { status: 404 });

  await db.scholarshipDisbursement.update({ where: { id: d.id }, data: { status: b.status, paidAt: b.status === "paid" ? new Date() : null } });
  await recordAudit({ action: "gicn_scholarship_disbursement_update", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { disbursementId: d.id, status: b.status } });
  return NextResponse.json({ ok: true });
}
