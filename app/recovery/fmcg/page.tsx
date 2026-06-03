import { ShoppingCart, ArrowRight, BadgeCheck, Banknote, Clock } from "lucide-react";
import Link from "next/link";

const CHARGES = [
  { name: "Commission on Turnover (COT)", risk: "FMCG distributors process thousands of debit transactions monthly — COT overcharges compound rapidly across high-volume accounts" },
  { name: "Letters of Credit Confirmation Fees", risk: "LC confirmation charges for import stock purchases are routinely applied above the CBN 1.5% per quarter ceiling" },
  { name: "SWIFT Transfer Fees", risk: "International supplier payments attract SWIFT fees above the $25 USD flat cap, often charged per transaction across hundreds of transfers annually" },
  { name: "Trade Finance / Import Finance Interest", risk: "Short-term import finance facilities often carry interest rates exceeding the MPR+7% CBN ceiling" },
  { name: "Account Maintenance Charges", risk: "Multiple current accounts for distributor collections carry maintenance fees above CBN ₦1/mille per quarter limit" },
];

const STATS = [
  { val: "₦5M – ₦50M", label: "Typical recovery range for FMCG distributors" },
  { val: "6 – 10 weeks", label: "Average audit to settlement timeline" },
  { val: "6 years", label: "Maximum retrospective recovery window under BOFIA Act 2020" },
];

export default function FMCGPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <ShoppingCart size={28} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-400">Sector Focus: FMCG & Distribution</p>
          <h1 className="font-display text-3xl font-semibold text-white lg:text-4xl">
            FMCG Distributors Face Hidden Bank Charges on Every Import and Every Sale
          </h1>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
            High transaction volumes from collections, combined with frequent LC and SWIFT charges on imports, make FMCG distribution businesses prime candidates for forensic bank charge recovery. MajorGBN has recovered funds for distributors across all product categories.
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
          <h2 className="mb-2 text-xl font-black text-slate-900">Where FMCG Distributors Are Most Exposed</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            FMCG distributors operate on thin margins — meaning excess bank charges represent a disproportionately large drain on profitability. The combination of high-frequency collections (triggering COT) and regular import activity (triggering LC and SWIFT charges) creates multiple simultaneous overcharge vectors.
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
              <span className="text-2xl font-black text-emerald-700">₦8.7M recovered</span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Clock size={14} /> 7 weeks
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            An Abuja-based FMCG distributor with significant import activity was charged LC confirmation fees of up to 3% per quarter — double the CBN maximum of 1.5%. Additionally, SWIFT transfer fees above the $25 flat cap were charged on 94 separate transactions over 4 years, yielding a combined recovery of ₦8.7M. The distributor had assumed the charges were standard industry practice.
          </p>
        </section>

        {/* What the audit covers */}
        <section>
          <h2 className="mb-6 text-xl font-black text-slate-900">What Our Audit Covers for FMCG Companies</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "COT analysis across all collection and payment accounts for up to 6 years",
              "LC confirmation fee compliance check on all import transactions",
              "SWIFT fee audit on every international transfer in the review period",
              "Import finance and trade line interest rate benchmarking",
              "Account maintenance fee review across all current accounts",
              "Cash deposit and handling charge verification",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <ArrowRight size={13} className="mt-0.5 shrink-0 text-blue-700" />
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-slate-950 p-10 text-center">
          <h2 className="text-2xl font-black text-white">Recover What Your Distribution Business Is Owed</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">No upfront fees. Success-fee only. Bank statements for 2+ years is all you need to start.</p>
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
