import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, Download } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import SponsorshipsAdmin from "./SponsorshipsAdmin";
import ReconcileButton from "./ReconcileButton";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "pending", "paid", "failed", "refunded", "cancelled"] as const;

export default async function AdminGicnSponsorshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "gicn.manage")) redirect("/admin");

  const sp = await searchParams;
  const statusFilter = (FILTERS as readonly string[]).includes(sp.status ?? "") && sp.status !== "all" ? sp.status! : null;
  const where = statusFilter ? { status: statusFilter } : {};

  const [counts, totalAgg, paidAgg, sponsorships] = await Promise.all([
    db.sponsorship.groupBy({ by: ["status"], _count: { _all: true } }),
    db.sponsorship.aggregate({ _sum: { amountKobo: true } }),
    db.sponsorship.aggregate({ _sum: { amountKobo: true }, where: { status: "paid" } }),
    db.sponsorship.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, sponsorName: true, sponsorEmail: true, amountKobo: true, status: true, createdAt: true, program: { select: { title: true } } },
    }),
  ]);

  const countByStatus: Record<string, number> = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const totalCount = counts.reduce((n, c) => n + c._count._all, 0);
  const pledged = Number(totalAgg._sum.amountKobo ?? 0) / 100;
  const paid = Number(paidAgg._sum.amountKobo ?? 0) / 100;

  const rows = sponsorships.map((s) => ({
    id: s.id,
    sponsorName: s.sponsorName,
    sponsorEmail: s.sponsorEmail,
    amountNgn: Number(s.amountKobo) / 100,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    programTitle: s.program?.title ?? null,
  }));

  const exportHref = `/api/admin/gicn/sponsorships/export${statusFilter ? `?status=${statusFilter}` : ""}`;

  return (
    <div className="space-y-6">
      <Link href="/admin/gicn" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> GICN
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><HeartHandshake size={20} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Sponsorship ledger</h1>
            <p className="text-xs text-slate-500">
              ₦{paid.toLocaleString("en-NG")} paid of ₦{pledged.toLocaleString("en-NG")} pledged · {totalCount} record{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReconcileButton />
          <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Download size={13} /> Export CSV
          </a>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f === "all" && !statusFilter) || f === statusFilter;
          const count = f === "all" ? totalCount : countByStatus[f] ?? 0;
          return (
            <Link
              key={f}
              href={f === "all" ? "?" : `?status=${f}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {f} <span className={active ? "text-slate-300" : "text-slate-400"}>{count}</span>
            </Link>
          );
        })}
      </div>

      <SponsorshipsAdmin rows={rows} />
    </div>
  );
}
