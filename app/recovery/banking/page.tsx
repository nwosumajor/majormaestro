import { Building2, ArrowRight, BadgeCheck, Banknote, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const CHARGES = [
  { name: "Inter-bank Transfer & Settlement Fees", risk: "High-volume transfers attract undisclosed or inflated processing charges above the EFT tier (₦10/₦25/₦50 by amount) and RTGS (₦950) caps" },
  { name: "Custody & Securities Handling Fees", risk: "Treasury and investment operations frequently attract fees that exceed disclosed rate schedules" },
  { name: "Overdraft / Credit Facility Interest", risk: "Interest charged above the rate in the facility letter, or penal rate above the 1%-flat-per-month cap, on liquidity-management facilities" },
  { name: "SWIFT & Correspondent Banking Charges", risk: "Correspondent-routed wires carrying commission above the 0.5% cap or hidden uplift (SWIFT itself is cost-recovery — no flat $25 cap)" },
  { name: "Impermissible / recurring facility fees", risk: "Recurring 'facility management/review' fees, or aggregate lending fees above the one-off 2% total — neither is permitted under the Guide" },
];

const STATS = [
  { val: "₦10M – ₦120M", label: "Typical recovery range for financial sector firms" },
  { val: "8 – 14 weeks", label: "Average audit to settlement timeline" },
  { val: "6 years", label: "Maximum retrospective recovery window under BOFIA Act 2020" },
];

export default function BankingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Building2 size={28} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-400">Sector Focus: Banking & Financial Services</p>
          <h1 className="font-display text-3xl font-semibold text-white lg:text-4xl">
            Financial Institutions Are Also Overcharged by Their Own Correspondent Banks
          </h1>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
            Finance companies, microfinance banks, insurance firms, and asset managers all maintain commercial banking relationships — and are subject to the same CBN charge overcharging as any other corporate entity.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/recovery#intake" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-colors">
              Lodge a Complaint <ArrowRight size={15} />
            </Link>
            <Link href="/recovery#prescreener" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors">
              Run Free Pre-Screen
            </Link>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">Important:</span> MajorGBN operates independently of all commercial banks. Our forensic work is conducted strictly against CBN and BOFIA regulatory standards. Banking relationships are never at risk from a legitimate recovery claim — banks are legally obligated to refund overcharges under the CBN Consumer Protection Circular.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-slate-200">
          {STATS.map((s) => (
            <div key={s.val} className="px-8 py-7 text-center">
              <p className="text-2xl font-black text-blue-900">{s.val}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-14 space-y-14">

        {/* Charges */}
        <section>
          <h2 className="mb-2 text-xl font-black text-slate-900">Where Financial Sector Companies Are Most Exposed</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            Financial sector companies often assume their internal treasury expertise protects them from bank overcharging — but CBN charge schedule violations are systematic and are rarely flagged proactively by relationship managers. Independent forensic review routinely surfaces excess charges even in the most financially sophisticated organisations.
          </p>
          <div className="space-y-3">
            {CHARGES.map((c) => (
              <div key={c.name} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{c.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{c.risk}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Case example */}
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-blue-600">Anonymised Case Study</p>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Banknote size={18} className="text-emerald-600" />
              <span className="text-2xl font-black text-emerald-700">₦67.8M recovered</span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Clock size={14} /> 14 weeks
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            A multi-state private healthcare group with four banking relationships and high transaction volumes illustrates the scale possible in high-turnover organisations. Account maintenance (CAMF) was consistently applied above the ₦1/mille cap and on non-qualifying debits across all accounts. Aggregate lending fees exceeded the one-off 2% ceiling on two facilities, and penal interest above the 1%-flat-per-month cap was identified. This engagement produced the largest single recovery in our portfolio. The principle applies equally to financial sector entities with comparable banking activity.
          </p>
        </section>

        {/* Who qualifies */}
        <section>
          <h2 className="mb-6 text-xl font-black text-slate-900">Who in Financial Services Qualifies</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Microfinance banks",
              "Finance companies and lenders",
              "Insurance companies and brokers",
              "Asset management firms",
              "Pension fund administrators",
              "Fintech companies with commercial banking relationships",
              "Bureau de change operators",
              "Mortgage and real estate finance companies",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <ArrowRight size={13} className="shrink-0 text-blue-700" />
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-slate-950 p-10 text-center">
          <h2 className="text-2xl font-black text-white">Find Out What Your Organisation Is Owed</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">Success-fee basis. No retainer. Fully NDA-protected engagement from day one.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/recovery#intake" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-colors">
              Lodge a Complaint <ArrowRight size={15} />
            </Link>
            <Link href="/recovery#quiz" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors">
              Take the Eligibility Quiz
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
