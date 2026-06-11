import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const ngn = (kobo: bigint | number | null | undefined) => (Number(kobo ?? 0) / 100).toString();

// Flat metric/value impact summary CSV — admin, gicn.manage. Audited.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const [programByStatus, programCount, participantCount, regByStatus, checkedIn, sponsorPledged, sponsorPaid, scholarByStatus, disbursedPaid] = await Promise.all([
    db.program.groupBy({ by: ["status"], _count: { _all: true } }),
    db.program.count(),
    db.participant.count(),
    db.programRegistration.groupBy({ by: ["status"], _count: { _all: true } }),
    db.programRegistration.count({ where: { checkedInAt: { not: null } } }),
    db.sponsorship.aggregate({ _sum: { amountKobo: true } }),
    db.sponsorship.aggregate({ _sum: { amountKobo: true }, where: { status: "paid" } }),
    db.scholarshipAward.groupBy({ by: ["status"], _count: { _all: true } }),
    db.scholarshipDisbursement.aggregate({ _sum: { amountKobo: true }, where: { status: "paid" } }),
  ]);

  const rows: [string, string | number][] = [
    ["programmes_total", programCount],
    ...programByStatus.map((p) => [`programmes_${p.status}`, p._count._all] as [string, number]),
    ["participants_total", participantCount],
    ...regByStatus.map((r) => [`registrations_${r.status}`, r._count._all] as [string, number]),
    ["registrations_checked_in", checkedIn],
    ["sponsorship_pledged_ngn", ngn(sponsorPledged._sum.amountKobo)],
    ["sponsorship_paid_ngn", ngn(sponsorPaid._sum.amountKobo)],
    ...scholarByStatus.map((s) => [`scholarships_${s.status}`, s._count._all] as [string, number]),
    ["scholarship_disbursed_ngn", ngn(disbursedPaid._sum.amountKobo)],
  ];

  const csv = ["metric,value", ...rows.map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`)].join("\r\n");
  await recordAudit({ action: "gicn_impact_export", actorLabel: gate.admin.email, targetType: "Gicn", metadata: { metrics: rows.length } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gicn-impact-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
