import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Scale, ArrowRight, FileText, TrendingUp, Sparkles, Settings, Users, Gift } from "lucide-react";
import { db } from "@/lib/db";
import { getClientUserFromCookies } from "@/lib/auth";
import { STEP_DEFS, type StepKey } from "@/lib/recoverySteps";
import LogoutButton from "./LogoutButton";
import MigrationBridge from "./MigrationBridge";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export default async function ClientDashboardPage() {
  const me = await getClientUserFromCookies();
  if (!me) {
    redirect(`/client/signin?next=${encodeURIComponent("/client/dashboard")}`);
  }
  if (!db) return <p className="p-12 text-center text-sm text-red-700">Database not configured.</p>;

  const [complaints, classifications, roadmaps, batches] = await Promise.all([
    db.recoveryComplaint.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        referenceId: true,
        companyName: true,
        status: true,
        createdAt: true,
        closedAt: true,
        assignedTeam: true,
      },
    }),
    db.savedClassification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, label: true, createdAt: true },
    }),
    db.savedRoadmap.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, label: true, createdAt: true },
    }),
    db.classificationBatch.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, label: true, status: true, total: true, completed: true, createdAt: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-900 text-white">
              <LayoutDashboard size={16} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">My Dashboard</p>
              <p className="text-xs text-slate-500">MajorGBN</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {me.imageUrl && (
                <Image src={me.imageUrl} alt={me.name ?? me.email} width={28} height={28} className="rounded-full" unoptimized />
              )}
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-800">{me.name ?? me.email}</p>
                <p className="text-[10px] text-slate-400">{me.email}</p>
              </div>
            </div>
            <Link
              href="/client/account"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Settings size={13} />
              <span className="hidden sm:inline">Account</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">

        <MigrationBridge />

        {/* Recovery cases */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">My Recovery Cases</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {complaints.length}
              </span>
            </div>
            <Link href="/recovery#intake" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900">
              Lodge new complaint <ArrowRight size={11} />
            </Link>
          </div>

          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Scale size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No cases yet</p>
              <p className="mt-1 text-xs text-slate-400">Cases lodged with the email <span className="font-mono">{me.email}</span> will appear here automatically.</p>
              <Link href="/recovery#intake" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors">
                Start a recovery case <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((c) => (
                    <tr key={c.referenceId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{c.referenceId}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{c.companyName}</p>
                        {c.assignedTeam && <p className="text-xs text-slate-500">{c.assignedTeam}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === "recovered" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {STEP_DEFS[c.status as StepKey]?.label ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmt(c.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/recovery/track`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">
                          Track <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* AI artifacts */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SavedList
            title="Saved Classifications"
            icon={Sparkles}
            iconColor="text-indigo-700"
            iconBg="bg-indigo-100"
            items={classifications}
            empty="No saved staff classifications yet."
            cta={{ href: "/assessment", label: "Run an assessment" }}
          />
          <SavedList
            title="Saved Roadmaps"
            icon={TrendingUp}
            iconColor="text-violet-700"
            iconBg="bg-violet-100"
            items={roadmaps}
            empty="No saved career roadmaps yet."
            cta={{ href: "/roadmap", label: "Build a roadmap" }}
          />
        </section>

        {/* Refer & earn */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Gift size={18} /></div>
              <div>
                <p className="text-sm font-bold text-slate-900">Refer &amp; earn</p>
                <p className="text-xs text-slate-600">Know another company that may be owed money? Earn a fixed bonus plus a share of their recovery.</p>
              </div>
            </div>
            <Link href="/recovery/refer" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors">
              Get my referral link <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* Bulk staff classifications (HR) */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-700" />
              <h2 className="text-base font-bold text-slate-900">Bulk Staff Classifications</h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{batches.length}</span>
            </div>
            <Link href="/client/bulk-classify" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">
              New bulk classification <ArrowRight size={11} />
            </Link>
          </div>
          {batches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Users size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No bulk batches yet</p>
              <p className="mt-1 text-xs text-slate-400">Classify a whole team from one spreadsheet.</p>
              <Link href="/client/bulk-classify" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 transition-colors">
                Start a bulk classification <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{b.label ?? "Bulk batch"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.status === "complete" ? "bg-emerald-100 text-emerald-700" : b.status === "failed" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.completed}/{b.total}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmt(b.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/client/bulk-classify/${b.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">
                          View <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Account</p>
          <p className="mt-1 text-xs text-slate-500">Signed in via Google as <span className="font-mono">{me.email}</span>. We don&apos;t store your password.</p>
        </section>
      </div>
    </main>
  );
}

interface SavedItem { id: string; label: string; createdAt: Date }

function SavedList({ title, icon: Icon, iconColor, iconBg, items, empty, cta }: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  items: SavedItem[];
  empty: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon size={13} className={iconColor} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="ml-auto text-xs text-slate-400">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center">
          <p className="text-xs text-slate-400">{empty}</p>
          <Link href={cta.href} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">
            {cta.label} <ArrowRight size={11} />
          </Link>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{i.label}</p>
                <p className="text-slate-400">{fmt(i.createdAt)}</p>
              </div>
              <FileText size={12} className="text-slate-400" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
