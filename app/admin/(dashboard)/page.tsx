import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowRight, FolderSearch, Inbox, CheckCircle2, Banknote, Users } from "lucide-react";
import { STEP_DEFS, type StepKey } from "@/lib/recoverySteps";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  if (!db) {
    return <p className="text-sm text-red-700">Database not configured.</p>;
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q?.trim()) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { referenceId: { contains: q.toUpperCase() } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { rcNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const [cases, totalAll, totalActive, totalRecovered, referralCount] = await Promise.all([
    db.recoveryComplaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { documents: true } } },
    }),
    db.recoveryComplaint.count(),
    db.recoveryComplaint.count({ where: { NOT: { status: "recovered" } } }),
    db.recoveryComplaint.count({ where: { status: "recovered" } }),
    db.referral.count(),
  ]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Total Cases" value={totalAll} accent="bg-blue-100 text-blue-700" />
        <Stat icon={FolderSearch} label="In Progress" value={totalActive} accent="bg-amber-100 text-amber-700" />
        <Stat icon={CheckCircle2} label="Recovered" value={totalRecovered} accent="bg-emerald-100 text-emerald-700" />
        <Stat icon={Users} label="Referral Partners" value={referralCount} accent="bg-violet-100 text-violet-700" />
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by company, reference, email, RC…"
          className="flex-1 min-w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="">All statuses</option>
          {(Object.keys(STEP_DEFS) as StepKey[]).map((k) => (
            <option key={k} value={k}>{STEP_DEFS[k].label}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          Filter
        </button>
        {(q || status) && (
          <Link href="/admin" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Cases table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Docs</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No cases match the current filter.</td></tr>
            ) : cases.map((c) => (
              <tr key={c.referenceId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{c.referenceId}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{c.companyName}</p>
                  <p className="text-xs text-slate-500">{c.contactEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {STEP_DEFS[c.status as StepKey]?.label ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{c.assignedTeam ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{c._count.documents}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/cases/${c.referenceId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">
                    Open <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <Banknote size={12} className="mr-1.5 inline" />
        Showing the {cases.length} most recent matches. Use filters above or the{" "}
        <a href="/api/admin/export/complaints" className="font-semibold text-blue-700 hover:underline">CSV export</a> for the full set.
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{value.toLocaleString()}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
