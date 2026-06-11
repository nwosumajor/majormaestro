import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { isScholarshipAction } from "@/lib/scholarship";
import { applyScholarshipDecision, type DecisionInput } from "@/lib/scholarshipDecide";

// Apply a review-board decision (claim/award/reject/verify_activate/suspend/
// reinstate/complete/terminate/withdraw/renew) — admin, scholarship.review.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { action?: string } & DecisionInput;
  if (!b.action || !isScholarshipAction(b.action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  // Guardian-only actions can't be driven from the admin board.
  if (b.action === "apply" || b.action === "nominate" || b.action === "onboarding_submit") {
    return NextResponse.json({ error: "That action is not a board decision." }, { status: 400 });
  }

  const result = await applyScholarshipDecision(id, b.action, gate.admin.email, b);
  if (!result.ok) {
    const code = result.error === "not_found" ? 404 : result.error === "unavailable" ? 503 : 409;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  return NextResponse.json({ ok: true, status: result.status });
}
