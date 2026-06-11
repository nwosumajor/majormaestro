import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import {
  SCHOLARSHIP_STATUSES,
  SCHOLARSHIP_STATUS_LABELS,
  SCHOLARSHIP_STATUS_TONE,
  isScholarshipStatus,
} from "@/lib/scholarship";

export const dynamic = "force-dynamic";

export default async function AdminScholarshipsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "scholarship.review")) redirect("/admin");

  const sp = await searchParams;
  const statusFilter = sp.status && isScholarshipStatus(sp.status) ? sp.status : null;
  const where = statusFilter ? { status: statusFilter } : {};

  const [counts, awardAgg, paidAgg, rows] = await Promise.all([
    db.scholarshipAward.groupBy({ by: ["status"], _count: { _all: true } }),
    db.scholarshipAward.aggregate({ _sum: { awardAmountKobo: true }, where: { status: "active" } }),
    db.scholarshipDisbursement.aggregate({ _sum: { amountKobo: true }, where: { status: "paid" } }),
    db.scholarshipAward.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, reference: true, status: true, awardAmountKobo: true, term: true, academicYear: true,
        participant: { select: { fullName: true } }, program: { select: { title: true } },
      },
    }),
  ]);

  const countByStatus: Record<string, number> = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((n, c) => n + c._count._all, 0);
  const activeValue = Number(awardAgg._sum.awardAmountKobo ?? 0) / 100;
  const disbursed = Number(paidAgg._sum.amountKobo ?? 0) / 100;

  return (
    <div className="space-y-6">
      <Link href="/admin/gicn" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> GICN
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Award size={20} /></div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Scholarship review board</h1>
          <p className="text-xs text-slate-500">
            {total} award{total === 1 ? "" : "s"} · ₦{activeValue.toLocaleString("en-NG")} active value · ₦{disbursed.toLocaleString("en-NG")} disbursed
          </p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link href="?" className={`rounded-full px-3 py-1 text-xs font-semibold ${!statusFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          All <span className={!statusFilter ? "text-slate-300" : "text-slate-400"}>{total}</span>
        </Link>
        {SCHOLARSHIP_STATUSES.map((s) => {
          const active = s === statusFilter;
          return (
            <Link key={s} href={`?status=${s}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {SCHOLARSHIP_STATUS_LABELS[s]} <span className={active ? "text-slate-300" : "text-slate-400"}>{countByStatus[s] ?? 0}</span>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Scholar</th>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3 text-right">Award</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No scholarship awards{statusFilter ? ` in "${SCHOLARSHIP_STATUS_LABELS[statusFilter]}"` : ""} yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/gicn/scholarships/${r.id}`} className="font-mono text-xs font-semibold text-blue-700 hover:underline">{r.reference ?? r.id.slice(0, 8)}</Link></td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.participant.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{r.program.title}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₦{(Number(r.awardAmountKobo) / 100).toLocaleString("en-NG")}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.term ?? "—"}{r.academicYear ? ` · ${r.academicYear}` : ""}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SCHOLARSHIP_STATUS_TONE[r.status as keyof typeof SCHOLARSHIP_STATUS_TONE] ?? "bg-slate-100 text-slate-600"}`}>
                    {SCHOLARSHIP_STATUS_LABELS[r.status as keyof typeof SCHOLARSHIP_STATUS_LABELS] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
