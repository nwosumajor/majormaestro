import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Record a referral payment (owner-only). Increments paidOutKobo so the admin
// view tracks earned-vs-paid. Optionally store the payout/bank note.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "referrals.payout");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { amountNgn?: number; bankDetails?: string };
  const amountNgn = Number(body.amountNgn);
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
    return NextResponse.json({ error: "A positive payout amount (₦) is required." }, { status: 400 });
  }
  const amountKobo = BigInt(Math.round(amountNgn * 100));

  const ref = await db.referral.findUnique({ where: { id }, select: { id: true, code: true, paidOutKobo: true } });
  if (!ref) return NextResponse.json({ error: "Referral not found." }, { status: 404 });

  const updated = await db.referral.update({
    where: { id },
    data: {
      paidOutKobo: ref.paidOutKobo + amountKobo,
      lastPaidAt: new Date(),
      ...(typeof body.bankDetails === "string" && body.bankDetails.trim()
        ? { bankDetails: body.bankDetails.trim().slice(0, 500) }
        : {}),
    },
    select: { paidOutKobo: true },
  });

  await recordAudit({
    action: "referral_payout_recorded",
    actorLabel: gate.admin.email,
    targetType: "Referral",
    targetId: id,
    metadata: { code: ref.code, amountKobo: amountKobo.toString() },
  });

  return NextResponse.json({ success: true, paidOutKobo: updated.paidOutKobo.toString() });
}
