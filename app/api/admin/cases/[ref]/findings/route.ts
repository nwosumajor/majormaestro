import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const MAX_FINDINGS_LEN = 16_000;
const MAX_RECOVERY_KOBO = BigInt("9999999999999"); // ₦99.99B safety ceiling

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  const gate = await requireAdmin(req, "cases.write");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ref } = await ctx.params;
  const referenceId = ref.toUpperCase();

  const { findingsSummary, recoveryAmountKobo } = (await req.json().catch(() => ({}))) as {
    findingsSummary?: string | null;
    recoveryAmountKobo?: number | null;
  };

  if (typeof findingsSummary === "string" && findingsSummary.length > MAX_FINDINGS_LEN) {
    return NextResponse.json({ error: "Findings summary too long." }, { status: 400 });
  }

  let kobo: bigint | null = null;
  if (typeof recoveryAmountKobo === "number") {
    if (!Number.isFinite(recoveryAmountKobo) || recoveryAmountKobo < 0) {
      return NextResponse.json({ error: "Recovery amount must be non-negative." }, { status: 400 });
    }
    kobo = BigInt(Math.round(recoveryAmountKobo));
    if (kobo > MAX_RECOVERY_KOBO) {
      return NextResponse.json({ error: "Recovery amount exceeds maximum allowed." }, { status: 400 });
    }
  }

  const complaint = await db.recoveryComplaint.findUnique({ where: { referenceId }, select: { id: true } });
  if (!complaint) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  await db.recoveryComplaint.update({
    where: { id: complaint.id },
    data: {
      findingsSummary: findingsSummary ?? null,
      recoveryAmountKobo: kobo,
    },
  });

  await recordAudit({
    action: "case_findings_update",
    actorLabel: admin.email,
    targetType: "RecoveryComplaint",
    targetId: complaint.id,
    metadata: { referenceId, hasFindings: !!findingsSummary, recoveryKobo: kobo?.toString() ?? null },
  });

  return NextResponse.json({ success: true });
}
