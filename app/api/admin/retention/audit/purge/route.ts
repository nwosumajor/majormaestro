import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { verifyStepUp } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const DEFAULT_RETENTION_DAYS = 730; // 2 years

function getRetentionDays(): number {
  const raw = process.env.AUDIT_LOG_RETENTION_DAYS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

function cutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - getRetentionDays());
  return d;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "audit.purge");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const cut = cutoff();
  const eligible = await db.auditLog.count({ where: { createdAt: { lt: cut } } });
  return NextResponse.json({
    retentionDays: getRetentionDays(),
    cutoff: cut.toISOString(),
    eligibleEntries: eligible,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "audit.purge");
  if (gate.error) return gate.error;
  const { admin } = gate;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const su = (await req.json().catch(() => ({}))) as { stepUpCode?: string; stepUpPassword?: string };
  if (!(await verifyStepUp(admin.id, { code: su.stepUpCode, password: su.stepUpPassword }))) {
    return NextResponse.json({ error: "Re-authentication required. Enter your current 2FA code to confirm this purge." }, { status: 401 });
  }

  const cut = cutoff();
  const { count } = await db.auditLog.deleteMany({ where: { createdAt: { lt: cut } } });

  // Record the purge itself AFTER deletion so the entry survives.
  await recordAudit({
    action: "audit_log_purge",
    actorLabel: admin.email,
    metadata: {
      retentionDays: getRetentionDays(),
      cutoff: cut.toISOString(),
      deletedEntries: count,
    },
  });

  return NextResponse.json({
    success: true,
    retentionDays: getRetentionDays(),
    deletedEntries: count,
  });
}
