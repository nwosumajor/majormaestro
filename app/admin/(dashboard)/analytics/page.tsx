import { db } from "@/lib/db";
import Link from "next/link";
import { BarChart3, Scale, Banknote, Users, Sparkles, FileSpreadsheet, Mail, UserPlus, ExternalLink } from "lucide-react";
import { STEP_KEYS, STEP_DEFS, type StepKey } from "@/lib/recoverySteps";

export const dynamic = "force-dynamic";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
function fmtNaira(kobo: bigint | null) {
  if (!kobo) return "₦0";
  return naira.format(Number(kobo) / 100);
}

export default async function AdminAnalyticsPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    complaintsTotal,
    complaints30,
    statusGroups,
    referredComplaints,
    recoveredAgg,
    leadsTotal,
    leads30,
    savedClassifications,
    savedRoadmaps,
    batches,
    staffClassified,
    usersTotal,
    users30,
    activeSessions,
    referrals,
  ] = await Promise.all([
    db.recoveryComplaint.count(),
    db.recoveryComplaint.count({ where: { createdAt: { gte: since30 } } }),
    db.recoveryComplaint.groupBy({ by: ["status"], _count: { _all: true } }),
    db.recoveryComplaint.count({ where: { referralCode: { not: null } } }),
    db.recoveryComplaint.aggregate({ _sum: { recoveryAmountKobo: true } }),
    db.leadMagnetSubscriber.count(),
    db.leadMagnetSubscriber.count({ where: { createdAt: { gte: since30 } } }),
    db.savedClassification.count(),
    db.savedRoadmap.count(),
    db.classificationBatch.count(),
    db.staffClassification.count(),
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since30 } } }),
    db.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    db.referral.count(),
  ]);

  const statusCounts = new Map<string, number>(statusGroups.map((g) => [g.status, g._count._all]));
  const recovered = statusCounts.get("recovered") ?? 0;
  const conversionRate = complaintsTotal > 0 ? Math.round((recovered / complaintsTotal) * 100) : 0;

  const headline = [
    { icon: Scale, label: "Recovery cases", value: complaintsTotal, sub: `${complaints30} in last 30 days`, tone: "text-emerald-700 bg-emerald-100" },
    { icon: Banknote, label: "Total recovered", value: fmtNaira(recoveredAgg._sum.recoveryAmountKobo), sub: `${recovered} cases closed as recovered`, tone: "text-emerald-700 bg-emerald-100", isText: true },
    { icon: BarChart3, label: "Case → recovery rate", value: `${conversionRate}%`, sub: `${recovered} of ${complaintsTotal} cases`, tone: "text-blue-700 bg-blue-100", isText: true },
    { icon: ExternalLink, label: "Referral-attributed", value: referredComplaints, sub: `${referrals} referral partners`, tone: "text-violet-700 bg-violet-100" },
  ];

  const acquisition = [
    { icon: Mail, label: "Lead-magnet subscribers", value: leadsTotal, sub: `${leads30} in last 30 days` },
    { icon: UserPlus, label: "Client accounts", value: usersTotal, sub: `${users30} new in last 30 days` },
    { icon: Users, label: "Active sessions", value: activeSessions, sub: "signed-in devices" },
  ];

  const aiUsage = [
    { icon: Sparkles, label: "Saved classifications (individual)", value: savedClassifications },
    { icon: Sparkles, label: "Saved roadmaps", value: savedRoadmaps },
    { icon: FileSpreadsheet, label: "Bulk classification batches", value: batches },
    { icon: FileSpreadsheet, label: "Staff classified (bulk)", value: staffClassified },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Analytics</h1>
          <p className="text-xs text-slate-500">First-party business metrics from the database. Real conversions, not estimates.</p>
        </div>
      </div>

      {/* Headline / revenue */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Recovery (revenue)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {headline.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon size={18} />
              </div>
              <p className="text-2xl font-black text-slate-900">{s.isText ? s.value : (s.value as number).toLocaleString()}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">{s.label}</p>
              <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recovery funnel by status */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Cases by stage</h2>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {STEP_KEYS.map((key: StepKey) => {
            const n = statusCounts.get(key) ?? 0;
            const pct = complaintsTotal > 0 ? (n / complaintsTotal) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs font-medium text-slate-600">{STEP_DEFS[key]?.label ?? key}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${key === "recovered" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-bold text-slate-800">{n}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Acquisition */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Acquisition</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {acquisition.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <s.icon size={18} />
              </div>
              <p className="text-2xl font-black text-slate-900">{s.value.toLocaleString()}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">{s.label}</p>
              <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI tools usage */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">AI tools usage</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {aiUsage.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <s.icon size={18} />
              </div>
              <p className="text-2xl font-black text-slate-900">{s.value.toLocaleString()}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
        <p className="font-semibold">Looking for traffic &amp; funnel drop-off?</p>
        <p className="mt-1 text-blue-700">
          Pageviews, referrers, devices, and the client-side conversion funnel events (CTA clicks, estimator/quiz completions, intake steps, bulk uploads) live in{" "}
          <Link href="https://vercel.com/nwosumajors-projects/majormaestro/analytics" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Vercel → Analytics
          </Link>. This panel covers first-party outcomes that land in our own database.
        </p>
      </div>
    </div>
  );
}
