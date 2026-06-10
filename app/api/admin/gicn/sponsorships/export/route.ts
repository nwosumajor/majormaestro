import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/rbac";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = ["reference", "createdAt", "paidAt", "status", "sponsorName", "sponsorEmail", "amountNgn", "programTitle", "providerRef"];
const VALID_STATUSES = new Set(["pending", "paid", "failed", "refunded", "cancelled"]);

// Export the GICN sponsorship ledger as CSV — admin, gicn.manage. Audited
// (contains sponsor PII). Optional ?status= filter.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const status = req.nextUrl.searchParams.get("status")?.trim();
  const where = status && VALID_STATUSES.has(status) ? { status } : {};

  const rows = await db.sponsorship.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      reference: true, createdAt: true, paidAt: true, status: true,
      sponsorName: true, sponsorEmail: true, amountKobo: true, providerRef: true,
      program: { select: { title: true } },
    },
  });

  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push([
      r.reference ?? "",
      r.createdAt.toISOString(),
      r.paidAt ? r.paidAt.toISOString() : "",
      r.status,
      r.sponsorName,
      r.sponsorEmail,
      (Number(r.amountKobo) / 100).toString(),
      r.program?.title ?? "",
      r.providerRef ?? "",
    ].map(csvEscape).join(","));
  }

  await recordAudit({
    action: "gicn_sponsorship_export",
    actorLabel: gate.admin.email,
    targetType: "Sponsorship",
    metadata: { count: rows.length, status: status ?? "all" },
  });

  const filename = `gicn-sponsorships${status ? `-${status}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
