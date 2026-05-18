import { db } from "@/lib/db";
import { Users, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export default async function AdminReferralsPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const referrals = await db.referral.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      complaints: { select: { status: true } },
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
          <p className="text-xs text-slate-500">{referrals.length} {referrals.length === 1 ? "partner" : "partners"} have generated referral links.</p>
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
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No referrals yet.</td></tr>
            ) : referrals.map((r) => {
              const recovered = r.complaints.filter((c) => c.status === "recovered").length;
              return (
                <tr key={r.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{r.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.referrerName}</p>
                    <p className="text-xs text-slate-500">{r.referrerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{r._count.complaints}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{recovered}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/recovery/refer/${r.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      View public dashboard <ExternalLink size={11} />
                    </a>
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
