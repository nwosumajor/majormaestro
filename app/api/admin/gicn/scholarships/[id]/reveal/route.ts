import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { verifyStepUp } from "@/lib/auth";
import { decryptSecret } from "@/lib/totp";

// Reveal the encrypted NIN or full payout account number for a single payout —
// admin, scholarship.disburse, with STEP-UP re-auth (current TOTP or password)
// and an audit entry. The plaintext is returned once and never logged.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.disburse");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { field?: string; stepUpCode?: string; stepUpPassword?: string };
  if (b.field !== "nin" && b.field !== "account") return NextResponse.json({ error: "field must be 'nin' or 'account'." }, { status: 400 });

  // Step-up: prove it's really this admin, right now.
  if (!(await verifyStepUp(gate.admin.id, { code: b.stepUpCode, password: b.stepUpPassword }))) {
    return NextResponse.json({ error: "Step-up verification failed. Enter your current 2FA code (or password)." }, { status: 403 });
  }

  const award = await db.scholarshipAward.findUnique({ where: { id }, select: { ninEncrypted: true, payoutAccountEncrypted: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const cipher = b.field === "nin" ? award.ninEncrypted : award.payoutAccountEncrypted;
  if (!cipher) return NextResponse.json({ error: `No ${b.field === "nin" ? "NIN" : "account number"} on file.` }, { status: 404 });

  let value: string;
  try {
    value = decryptSecret(cipher);
  } catch {
    return NextResponse.json({ error: "Could not decrypt — data may be corrupted." }, { status: 500 });
  }

  // Audit the reveal (who, what, when) — never the value itself.
  await recordAudit({ action: "gicn_scholarship_reveal", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { field: b.field } });

  return NextResponse.json({ field: b.field, value });
}
