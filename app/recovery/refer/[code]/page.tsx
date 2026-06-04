import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, TrendingUp, Users, CheckCircle2, Banknote, Clock, ArrowRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { STEP_DEFS, type StepKey } from "@/lib/recoverySteps";
import { computeEarned, nairaFromKobo } from "@/lib/referrals";
import CopyLinkButton from "./CopyLinkButton";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export default async function PublicReferralDashboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!db) return <p className="p-12 text-center text-sm text-red-700">Service temporarily unavailable.</p>;

  const referral = await db.referral.findUnique({
    where: { code },
    include: {
      complaints: {
        select: { referenceId: true, companyName: true, status: true, createdAt: true, recoveryAmountKobo: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!referral) notFound();

  const earned = computeEarned(referral.complaints);
  const recovered = earned.recoveredCount;
  const active = referral.complaints.length - recovered;
  const balanceKobo = earned.earnedKobo - referral.paidOutKobo;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";
  const shareUrl = `${base}/recovery?ref=${referral.code}`;
  const waText = encodeURIComponent(
    `Hello, MajorGBN helped us recover excess bank charges. If your company banks in Nigeria, check if you're owed money too: ${shareUrl}`
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-slate-950 px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Gift size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Referral Dashboard</p>
              <h1 className="text-2xl font-black text-white">Welcome back, {referral.referrerName}</h1>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Code <span className="font-mono font-semibold text-white">{referral.code}</span> · Active since {fmtDate(referral.createdAt)}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Total Leads" value={referral.complaints.length.toString()} accent="bg-blue-100 text-blue-700" />
          <Stat icon={Clock} label="In Progress" value={active.toString()} accent="bg-amber-100 text-amber-700" />
          <Stat icon={CheckCircle2} label="Recovered" value={recovered.toString()} accent="bg-emerald-100 text-emerald-700" />
          <Stat icon={Banknote} label="Earned" value={nairaFromKobo(earned.earnedKobo)} accent="bg-blue-100 text-blue-700" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm">
          <span className="text-slate-500">Paid out: <span className="font-semibold text-slate-800">{nairaFromKobo(referral.paidOutKobo)}</span></span>
          <span className="text-slate-500">Outstanding balance: <span className="font-bold text-emerald-700">{nairaFromKobo(balanceKobo > BigInt(0) ? balanceKobo : BigInt(0))}</span></span>
          {referral.verifiedAt
            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> Email verified</span>
            : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock size={12} /> Verify your email to receive payouts</span>}
        </div>

        {/* Share */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Your share link</h2>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-0 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 font-mono text-xs text-slate-700 break-all">
              {shareUrl}
            </div>
            <CopyLinkButton url={shareUrl} />
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:bg-[#20b757] transition-colors"
            >
              <MessageCircle size={14} /> Share
            </a>
          </div>
        </div>

        {/* Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
            <h2 className="text-sm font-bold text-slate-700">Your Leads</h2>
          </div>
          {referral.complaints.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-semibold text-slate-500">No leads yet</p>
              <p className="mt-1 text-xs text-slate-400">Share your link to start earning. Companies that lodge a complaint via your link will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referral.complaints.map((c) => (
                  <tr key={c.referenceId}>
                    <td className="px-6 py-3">
                      <p className="font-semibold text-slate-800">{c.companyName}</p>
                      <p className="font-mono text-xs text-slate-400">{c.referenceId}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === "recovered" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {STEP_DEFS[c.status as StepKey]?.label ?? c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
          <p className="font-semibold flex items-center gap-2"><TrendingUp size={14} />Commission summary</p>
          <p className="mt-1 text-xs text-blue-800">
            5% of the first recovery + 3% of subsequent recoveries from the same client, plus a ₦100,000 bonus per completed audit. Statements are issued by email at the point of each recovery confirmation.
          </p>
        </div>

        <Link href="/recovery/refer" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
          <ArrowRight size={12} className="rotate-180" /> Generate a new referral code
        </Link>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
