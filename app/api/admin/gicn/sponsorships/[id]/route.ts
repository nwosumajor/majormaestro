import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const SPONSORSHIP_STATUSES = ["pending", "paid", "refunded", "cancelled"] as const;

// Update a sponsorship's status (ledger reconciliation) — admin, gicn.manage.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { status?: string };
  if (!b.status || !SPONSORSHIP_STATUSES.includes(b.status as (typeof SPONSORSHIP_STATUSES)[number])) {
    return NextResponse.json({ error: `Status must be one of: ${SPONSORSHIP_STATUSES.join(", ")}.` }, { status: 400 });
  }

  const existing = await db.sponsorship.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Sponsorship not found." }, { status: 404 });

  await db.sponsorship.update({ where: { id }, data: { status: b.status } });
  await recordAudit({ action: "gicn_sponsorship_update", actorLabel: gate.admin.email, targetType: "Sponsorship", targetId: id, metadata: { status: b.status } });
  return NextResponse.json({ success: true });
}
