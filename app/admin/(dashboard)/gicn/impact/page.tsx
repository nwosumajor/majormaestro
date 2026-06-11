import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, BarChart3 } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import { PROGRAM_TYPE_LABELS } from "@/lib/gicn";

export const dynamic = "force-dynamic";

const ngn = (kobo: bigint | number | null | undefined) => "₦" + (Number(kobo ?? 0) / 100).toLocaleString("en-NG");

function Breakdown({ title, rows, fmt }: { title: string; rows: { key: string; count: number }[]; fmt?: (k: string) => string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {rows.length === 0 && <li className="text-xs text-slate-400">None yet.</li>}
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between">
            <span className="capitalize text-slate-700">{fmt ? fmt(r.key) : r.key.replace(/_/g, " ").toLowerCase()}</span>
            <span className="font-semibold text-slate-900">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function GicnImpactPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "gicn.manage")) redirect("/admin");

  const [
    programCount, programByStatus, programByType, participantCount,
    regByStatus, checkedInCount, sponsorPledged, sponsorPaid,
    scholarByStatus, scholarActiveValue, disbursedPaid,
  ] = await Promise.all([
    db.program.count(),
    db.program.groupBy({ by: ["status"], _count: { _all: true } }),
    db.program.groupBy({ by: ["type"], _count: { _all: true } }),
    db.participant.count(),
    db.programRegistration.groupBy({ by: ["status"], _count: { _all: true } }),
    db.programRegistration.count({ where: { checkedInAt: { not: null } } }),
    db.sponsorship.aggregate({ _sum: { amountKobo: true } }),
    db.sponsorship.aggregate({ _sum: { amountKobo: true }, where: { status: "paid" } }),
    db.scholarshipAward.groupBy({ by: ["status"], _count: { _all: true } }),
    db.scholarshipAward.aggregate({ _sum: { awardAmountKobo: true }, where: { status: "active" } }),
    db.scholarshipDisbursement.aggregate({ _sum: { amountKobo: true }, where: { status: "paid" } }),
  ]);

  const scholarCount = scholarByStatus.reduce((n, s) => n + s._count._all, 0);
  const activeScholars = scholarByStatus.find((s) => s.status === "active")?._count._all ?? 0;
  const regCount = regByStatus.reduce((n, r) => n + r._count._all, 0);

  const stats = [
    { label: "Programmes", value: programCount },
    { label: "Participants", value: participantCount },
    { label: "Registrations", value: regCount },
    { label: "Check-ins", value: checkedInCount },
    { label: "Sponsorship paid", value: ngn(sponsorPaid._sum.amountKobo) },
    { label: "Sponsorship pledged", value: ngn(sponsorPledged._sum.amountKobo) },
    { label: "Active scholars", value: activeScholars },
    { label: "Scholarship disbursed", value: ngn(disbursedPaid._sum.amountKobo) },
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/gicn" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> GICN
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><BarChart3 size={20} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900">GICN impact report</h1>
            <p className="text-xs text-slate-500">Programmes, participants, check-ins, sponsorships and scholarships at a glance.</p>
          </div>
        </div>
        <a href="/api/admin/gicn/impact/export" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Download size={13} /> Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-figure text-2xl font-black text-slate-900">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Breakdown title="Programmes by status" rows={programByStatus.map((p) => ({ key: p.status, count: p._count._all }))} />
        <Breakdown title="Programmes by type" rows={programByType.map((p) => ({ key: p.type, count: p._count._all }))} fmt={(k) => PROGRAM_TYPE_LABELS[k as keyof typeof PROGRAM_TYPE_LABELS] ?? k} />
        <Breakdown title="Registrations by status" rows={regByStatus.map((r) => ({ key: r.status, count: r._count._all }))} />
        <Breakdown title="Scholarships by status" rows={scholarByStatus.map((s) => ({ key: s.status, count: s._count._all }))} />
      </div>

      <p className="text-center text-xs text-slate-400">
        {scholarCount} scholarship award{scholarCount === 1 ? "" : "s"} · {ngn(scholarActiveValue._sum.awardAmountKobo)} active award value.
      </p>
    </div>
  );
}
