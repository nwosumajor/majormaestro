import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

function retentionDays(): number {
  const n = Number(process.env.ANALYTICS_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 180;
}

// CSV backup of first-party analytics events (auto-purged by the daily cron).
// Defaults to the PURGE-ELIGIBLE subset (older than retention); ?all=1 = everything.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "pii.export");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const all = req.nextUrl.searchParams.get("all") === "1";
  const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
  const where = all ? {} : { createdAt: { lt: cutoff } };

  const rows = await db.analyticsEvent.findMany({ where, orderBy: { createdAt: "asc" }, take: 200_000 });
  const csv = toCsv(
    ["createdAt", "name", "props"],
    rows.map((r) => [r.createdAt.toISOString(), r.name, r.props != null ? JSON.stringify(r.props) : ""])
  );

  const admin = await getAdminFromRequest(req);
  await recordAudit({ action: "analytics_export", actorLabel: admin?.email ?? "admin", metadata: { count: rows.length, scope: all ? "all" : "eligible" } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-${all ? "all" : "eligible"}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
