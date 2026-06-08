import { Factory, ArrowRight, BadgeCheck, Banknote, Clock } from "lucide-react";
import Link from "next/link";

const CHARGES = [
  { name: "Account Maintenance (CAMF)", risk: "CAMF applied above the ₦1/mille (0.1%) cap, or on non-qualifying debits (intra-bank/own-account transfers) — plus recoverable historical COT for pre-2016 periods" },
  { name: "Overdraft / Working Capital Interest", risk: "Interest charged above the rate in the facility letter, or penal rate above the 1%-flat-per-month cap on seasonal credit and import finance lines" },
  { name: "Letters of Credit Charges", risk: "LC confirmation fees above the 0.5%-of-face-value maximum, or establishment commission above the 1% / 1.25% / 1.5% tenor caps on raw-material imports" },
  { name: "SWIFT Transfer Commission", risk: "Commission above the 0.5% cap on foreign supplier payments (SWIFT itself is cost-recovery — there is no flat $25 cap)" },
  { name: "Impermissible / recurring facility fees", risk: "Recurring 'facility review' fees, or aggregate lending fees above the one-off 2% total — neither is permitted under the Guide" },
];

const STATS = [
  { val: "₦15M – ₦80M", label: "Typical recovery range for manufacturers" },
  { val: "7 – 12 weeks", label: "Average audit to settlement timeline" },
  { val: "6 years", label: "Maximum retrospective recovery window under BOFIA Act 2020" },
];

export default function ManufacturingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Factory size={28} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-400">Sector Focus: Manufacturing</p>
          <h1 className="font-display text-3xl font-semibold text-white lg:text-4xl">
            Manufacturing Companies Are Among Nigeria&apos;s Most Overcharged Bank Customers
          </h1>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
            High transaction volumes, import finance lines, and multiple banking relationships create the ideal conditions for excess charges to compound undetected over years. MajorGBN has recovered millions for Nigerian manufacturers.
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

        {/* Why manufacturers are exposed */}
        <section>
          <h2 className="mb-2 text-xl font-black text-slate-900">Why Manufacturing Companies Are Particularly Exposed</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            The combination of high monthly debit volumes (driving account-maintenance/CAMF charges), foreign currency transactions (SWIFT + LC charges), and working capital facilities (overdraft + term loans) means a mid-sized manufacturer can accumulate hundreds of excess charge events per year across each banking relationship.
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
              <span className="text-2xl font-black text-emerald-700">₦31.4M recovered</span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Clock size={14} /> 10 weeks
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            A Lagos-based industrial manufacturer with ₦1.2B annual turnover had maintained two banking relationships for 7 years. Our forensic team found account maintenance (CAMF) applied above the ₦1/mille cap and on non-qualifying debits, plus recoverable historical COT on pre-2016 periods. Combined with overdraft interest charged above the agreed facility-letter rate, the total recovery exceeded ₦31M across both banks. The client had no prior awareness of the overcharging.
          </p>
        </section>

        {/* Process */}
        <section>
          <h2 className="mb-6 text-xl font-black text-slate-900">What the Audit Covers for Manufacturing Companies</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "CAMF analysis on qualifying current-account debits (and historical COT for pre-2016 periods) for up to 6 years",
              "Overdraft and working-capital interest benchmarked against the agreed facility rate and the 1%/month penal cap",
              "LC establishment (tenor-based) and confirmation (≤0.5%) fee verification on imports",
              "SWIFT commission compliance check (cost recovery + ≤0.5% commission) on all foreign payments",
              "Identification of impermissible recurring facility/review fees",
              "Aggregate lending-fee check (one-off, ≤2% total) across all facilities",
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
          <h2 className="text-2xl font-black text-white">Find Out What Your Manufacturing Company Is Owed</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">No upfront fees. No retainer. We work on a success-fee basis — we only earn when you recover.</p>
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
