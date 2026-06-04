import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Users, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import { computeEarned, nairaFromKobo } from "@/lib/referrals";
import RecordPayoutButton from "./RecordPayoutButton";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export default async function AdminReferralsPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "referrals.read")) redirect("/admin");
  const isOwner = role === "owner";

  const referrals = await db.referral.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      complaints: { select: { status: true, recoveryAmountKobo: true } },
      _count: { select: { complaints: true } },
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Referral Partners</h1>
          <p className="text-xs text-slate-500">{referrals.length} {referrals.length === 1 ? "partner" : "partners"}. Earned = ₦100k per completed audit + 5% of recovered amounts; balance = earned − paid.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3 text-right">Leads</th>
              <th className="px-4 py-3 text-right">Recovered</th>
              <th className="px-4 py-3 text-right">Earned</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No referrals yet.</td></tr>
            ) : referrals.map((r) => {
              const earned = computeEarned(r.complaints);
              const balanceKobo = earned.earnedKobo - r.paidOutKobo;
              return (
                <tr key={r.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{r.code}</td>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                      {r.referrerName}
                      {r.verifiedAt
                        ? <CheckCircle2 size={12} className="text-emerald-600" aria-label="verified" />
                        : <Clock size={12} className="text-amber-500" aria-label="unverified" />}
                    </p>
                    <p className="text-xs text-slate-500">{r.referrerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{r._count.complaints}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{earned.recoveredCount}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">{nairaFromKobo(earned.earnedKobo)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{nairaFromKobo(r.paidOutKobo)}</td>
                  <td className={`px-4 py-3 text-right text-xs font-bold ${balanceKobo > BigInt(0) ? "text-rose-700" : "text-slate-400"}`}>{nairaFromKobo(balanceKobo > BigInt(0) ? balanceKobo : BigInt(0))}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {isOwner && <RecordPayoutButton referralId={r.id} code={r.code} />}
                      <a
                        href={`/recovery/refer/${r.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        Dashboard <ExternalLink size={11} />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Share link template: <span className="font-mono">{base || "https://majormaestro.com"}/recovery?ref=&lt;code&gt;</span>
      </p>
    </div>
  );
}
