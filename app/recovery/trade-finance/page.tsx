import { Ship, ArrowRight, BadgeCheck, Banknote, Clock, ShieldCheck, Coins } from "lucide-react";
import Link from "next/link";
import LcCollateralCalculator from "@/components/LcCollateralCalculator";

const CHARGES = [
  { name: "Interest owed on LC cash-collateral", highlight: true, risk: "When you lodge cash cover for an LC, that collateral is a special-purpose deposit — the bank MUST pay you credit interest of at least 30% of MPR (≈8.25% p.a. at a 27.5% MPR). Most importers are paid little or nothing. The shortfall, compounded across years of LCs, is recoverable — unless the cover was funded by a bank loan." },
  { name: "Offshore charges in SWIFT Field 71D", risk: "Advising, amendment, confirmation, negotiation, transfer and reimbursement charges (and any 'all overseas/offshore charges' line) are recoverable from you only at actual cost. Undisclosed margins added to correspondent-bank charges, or costs defaulted to you without a documented instruction, are recoverable." },
  { name: "Confirmation-line & refinancing 'pre-/post-negotiation' fees", risk: "'Pre-negotiation' and 'post-negotiation' are not recognised CBN or UCP600 terms. Where these labels are used to apply margined charges that were never properly disclosed on the offer letter — or stacked on top of other offshore charges — they are disputable." },
  { name: "FX differentials from bank delay or inaction", risk: "On LCs left unsettled during FX scarcity, you should not bear differential or penal/overdraft costs caused by the bank's own delayed engagement, failure to evidence genuine FX sourcing, or poor disclosure. Nostro-overdraft penalties must be passed through at cost and prorated — not marked up." },
  { name: "Undisclosed amendment, SWIFT & courier fees", risk: "Section 4 of the CBN Consumer Protection Regulation is explicit: a fee that was not disclosed and agreed before it was applied cannot be earned. Recurring telex/SWIFT, amendment and courier charges that never appeared on your offer letter are recoverable." },
];

const STATS = [
  { val: "₦8M – ₦90M", label: "Typical recovery range for LC-active importers" },
  { val: "6 – 12 weeks", label: "Average audit to settlement timeline" },
  { val: "6 years", label: "Maximum retrospective recovery window under BOFIA Act 2020" },
];

export default function TradeFinancePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Ship size={28} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent-bright">Sector Focus: Trade Finance, FX & Letters of Credit</p>
          <h1 className="font-display text-3xl font-semibold text-white lg:text-4xl">
            Letters of Credit Are the Most Overcharged — and Least Audited — Banking Importers Do
          </h1>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
            Every LC carries layers of charges — establishment, confirmation, offshore correspondent fees, refinancing, FX — and an interest entitlement most companies never collect. The 2024 Bankers&apos; Committee framework on FX-linked obligations confirms exactly where banks overreach. We audit it line by line.
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
              <p className="text-2xl font-black text-ink">{s.val}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-14 space-y-14">

        {/* The interest nobody collects — the hook */}
        <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Coins size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-emerald-900">The entitlement most importers never claim</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                Cash you lodge as LC cover is a <strong>special-purpose deposit</strong> — locked and inaccessible. Under the CBN Monetary, Credit, Foreign Trade &amp; Exchange Policy Guidelines (§3.2) and the Guide to Bank Charges, the bank is obliged to pay you credit interest of <strong>at least 30% of the MPR</strong> on it. At a 27.5% MPR that is roughly <strong>8.25% per annum</strong> on every naira of cover, for as long as it is held. Across multiple LCs over several years, the uncollected interest alone routinely runs into tens of millions — and it is recoverable up to 6 years back.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive calculator */}
        <section id="calculator" className="scroll-mt-20">
          <LcCollateralCalculator />
        </section>

        {/* Why importers are exposed */}
        <section>
          <h2 className="mb-2 text-xl font-black text-slate-900">Where Trade-Finance Customers Are Most Exposed</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            LC pricing is opaque by design — establishment and confirmation commissions, offshore correspondent fees buried in SWIFT Field 71D, confirmation-line and refinancing charges, and FX differentials all stack on a single transaction. Each is governed by a specific rule, and each is a place banks routinely overreach.
          </p>
          <div className="space-y-3">
            {CHARGES.map((c) => (
              <div key={c.name} className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${c.highlight ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
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
        <section className="rounded-2xl border border-accent/20 bg-accent-soft p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-accent">Anonymised Case Study</p>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Banknote size={18} className="text-emerald-600" />
              <span className="text-2xl font-black text-emerald-700">₦46.2M recovered</span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Clock size={14} /> 11 weeks
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            An importer of industrial raw materials had opened dozens of Letters of Credit across two banks over five years, lodging substantial cash cover for each. Our forensic team found the bank had paid no credit interest on collateral that sat locked as special-purpose deposits — a clear breach of the 30%-of-MPR floor. Layered on top were offshore correspondent charges in Field 71D carrying undisclosed margins, and &quot;post-negotiation&quot; refinancing fees that never appeared on a single offer letter. The combined recovery exceeded ₦46M.
          </p>
        </section>

        {/* What the audit covers */}
        <section>
          <h2 className="mb-6 text-xl font-black text-slate-900">What Our Audit Covers for Trade-Finance Customers</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Credit-interest reconstruction on all LC cash-collateral / cover deposits against the 30%-of-MPR floor",
              "LC establishment (tenor-based) and confirmation (≤0.5%) commission verification on every LC",
              "Line-by-line review of SWIFT Field 71D offshore charges for undisclosed margins (cost-recovery only)",
              "Confirmation-line & refinancing / 'pre-/post-negotiation' fees tested against your offer letters",
              "FX-differential and nostro-overdraft penal costs caused by bank delay or non-disclosure",
              "Full disclosure audit against Section 4 of the CBN Consumer Protection Regulation",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <ArrowRight size={13} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Regulatory authority callout — trust = conversion */}
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Grounded in the regulations banks are bound by</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Our trade-finance findings are benchmarked against the <strong>CBN Guide to Bank Charges</strong>, the <strong>Monetary, Credit, Foreign Trade &amp; Exchange Policy Guidelines 2022/2023</strong>, the <strong>CBN Consumer Protection Regulation</strong>, <strong>UCP600</strong>, and the <strong>Bankers&apos; Committee (CIBN) framework on FX-linked obligations, Letters of Credit and Trade Instruments</strong>. Every charge we flag is cross-referenced to a specific rule and to your own statements and offer letters — a report built to withstand challenge and, where needed, formal escalation to the CBN Consumer Protection Department.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-slate-950 p-10 text-center">
          <h2 className="text-2xl font-black text-white">Find Out What Your Letters of Credit Are Owed</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">No upfront fees. Success-fee only. Your LC documentation and 2+ years of statements are all we need to start.</p>
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
