import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { confirmSponsorshipByReference } from "@/lib/sponsorship";
import { sendSponsorshipConfirmation } from "@/lib/email";

// Verify a single pending sponsorship against Paystack (the per-row counterpart
// to bulk reconcile) — admin, gicn.manage. Idempotent; emails on confirmation.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const sp = await db.sponsorship.findUnique({ where: { id }, select: { status: true, reference: true } });
  if (!sp) return NextResponse.json({ error: "Sponsorship not found." }, { status: 404 });
  if (sp.status !== "pending") return NextResponse.json({ ok: true, outcome: sp.status, note: "Already resolved." });
  if (!sp.reference) return NextResponse.json({ error: "No payment reference to verify (payments not configured?)." }, { status: 409 });

  const result = await confirmSponsorshipByReference(sp.reference);
  if (result.justConfirmed && result.email) {
    const e = result.email;
    after(() => sendSponsorshipConfirmation({ ...e, paid: true }).catch((err) => console.error("[gicn-verify] email error:", err)));
  }

  await recordAudit({
    action: "gicn_sponsorship_verify",
    actorLabel: gate.admin.email,
    targetType: "Sponsorship",
    targetId: id,
    metadata: { reference: sp.reference, outcome: result.outcome },
  });

  return NextResponse.json({ ok: true, outcome: result.outcome });
}
