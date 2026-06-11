import Link from "next/link";
import { Award, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getClientUserFromCookies } from "@/lib/auth";
import { SCHOLARSHIP_STATUS_LABELS, SCHOLARSHIP_STATUS_TONE } from "@/lib/scholarship";

export const dynamic = "force-dynamic";

export default async function GuardianScholarshipsPage() {
  const me = await getClientUserFromCookies();
  if (!me || !db) return null; // layout already guards auth

  const awards = await db.scholarshipAward.findMany({
    where: { participant: { ownerUserId: me.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true, reference: true, status: true, awardAmountKobo: true, term: true, participant: { select: { fullName: true } }, program: { select: { title: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Scholarships</h1>
          <p className="text-sm text-slate-500">Apply for a scholarship for a child in your care and track its progress.</p>
        </div>
        <Link href="/gicn/scholarships/apply" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
          <Award size={15} /> Apply for a scholarship
        </Link>
      </div>

      {awards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <Award size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">No scholarship applications yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {awards.map((a) => (
              <li key={a.id}>
                <Link href={`/gicn/scholarships/${a.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">{a.participant.fullName}</p>
                    <p className="text-xs text-slate-500">{a.program.title}{a.term ? ` · ${a.term}` : ""} · <span className="font-mono">{a.reference ?? a.id.slice(0, 8)}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    {Number(a.awardAmountKobo) > 0 && <span className="text-sm font-semibold text-slate-700">₦{(Number(a.awardAmountKobo) / 100).toLocaleString("en-NG")}</span>}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SCHOLARSHIP_STATUS_TONE[a.status as keyof typeof SCHOLARSHIP_STATUS_TONE] ?? "bg-slate-100 text-slate-600"}`}>
                      {SCHOLARSHIP_STATUS_LABELS[a.status as keyof typeof SCHOLARSHIP_STATUS_LABELS] ?? a.status}
                    </span>
                    <ArrowRight size={15} className="text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
