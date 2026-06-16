import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

function retentionDays(): number {
  const n = Number(process.env.AUDIT_LOG_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 730;
}

// CSV backup of audit-log entries — gated by the same permission that purges them
// (owner-only). Defaults to the PURGE-ELIGIBLE subset (older than retention) so an
// admin can back up exactly what's about to be deleted; ?all=1 exports everything.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "audit.purge");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const all = req.nextUrl.searchParams.get("all") === "1";
  const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
  const where = all ? {} : { createdAt: { lt: cutoff } };

  const rows = await db.auditLog.findMany({ where, orderBy: { createdAt: "asc" }, take: 100_000 });
  const csv = toCsv(
    ["createdAt", "action", "actorLabel", "targetType", "targetId", "metadata"],
    rows.map((r) => [
      r.createdAt.toISOString(),
      r.action,
      r.actorLabel,
      r.targetType ?? "",
      r.targetId ?? "",
      r.metadata != null ? JSON.stringify(r.metadata) : "",
    ])
  );

  const admin = await getAdminFromRequest(req);
  await recordAudit({ action: "audit_log_export", actorLabel: admin?.email ?? "admin", metadata: { count: rows.length, scope: all ? "all" : "eligible" } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${all ? "all" : "eligible"}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
