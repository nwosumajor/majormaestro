import { Store, ShieldCheck, Zap, Wallet, ArrowRight, CircleCheck } from "lucide-react";

/**
 * SME-focused section for the recovery landing page. Speaks directly to small &
 * medium business owners (the new ₦5M–₦49M turnover band) — emphasising that the
 * zero-risk, success-fee model makes a forensic audit accessible to them too.
 */

const SME_BENEFITS = [
  {
    icon: Wallet,
    title: "Zero upfront cost",
    desc: "No retainer, no audit fee. You pay 30% only on funds we actually recover — if nothing is found, you owe nothing.",
  },
  {
    icon: Zap,
    title: "Fast, focused audits",
    desc: "SME accounts are leaner, so our forensic review is quicker — typical turnaround of just 3 – 5 weeks from documents to findings.",
  },
  {
    icon: ShieldCheck,
    title: "Built for your size",
    desc: "A dedicated ₦5M – ₦49M turnover track. The same CBN/BOFIA-grade forensic audit the big firms get, scaled to a small business.",
  },
];

const SME_OVERCHARGES = [
  "Excess COT and account maintenance fees",
  "Interest charged above your agreed rate",
  "Undisclosed SMS, card and processing charges",
  "Wrongful VAT and stamp-duty deductions",
];

export default function SmeSection() {
  return (
    <section id="sme" className="bg-white py-16 sm:py-24 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            <Store size={13} /> For Small &amp; Medium Businesses
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Think excess charges only hurt big corporates? Think again.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
            Nigerian SMEs lose millions every year to silent bank overcharges — small deductions
            that add up across thousands of transactions. With turnover from{" "}
            <span className="font-semibold text-ink">₦5M to ₦49M</span>, you&apos;re very likely owed
            money. We help you get it back, at no risk.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {SME_BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950 text-emerald-400">
                <Icon size={22} />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
              What we typically find on SME accounts
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SME_OVERCHARGES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Typical SME recovery
            </p>
            <p className="mt-2 font-figure text-3xl font-black text-emerald-700">
              ₦150,000 – ₦1.2M
            </p>
            <p className="mt-1 text-xs text-slate-500">in 3 – 5 weeks · 30% success fee · no recovery, no fee</p>
            <a
              href="#intake"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-accent-bright"
            >
              Check what your business is owed
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
