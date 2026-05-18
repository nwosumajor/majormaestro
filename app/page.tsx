import Link from "next/link";
import {
  BrainCircuit,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Route,
  Scale,
  Banknote,
  Search,
  CircleCheck,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Psychographic Analysis",
    description:
      "Evaluates psychological, mental, social, and environmental attributes to understand each individual holistically.",
  },
  {
    icon: ShieldCheck,
    title: "Certification-Aware Matching",
    description:
      "Factors in acquired certifications to surface the most credible, role-ready placement recommendations.",
  },
  {
    icon: BarChart3,
    title: "Top 3 Department Fits",
    description:
      "Returns a ranked shortlist of three best-fit departments with detailed reasoning for each placement.",
  },
];

const roadmapFeatures = [
  {
    icon: Route,
    title: "Current → Future State Mapping",
    description:
      "Define where you are today and where you want to be in up to 15 years, and let AI chart the path.",
  },
  {
    icon: Sparkles,
    title: "Milestone-Driven Planning",
    description:
      "Each phase of your career is broken into concrete milestones grounded in real industry requirements.",
  },
  {
    icon: TrendingUp,
    title: "Certification Roadmap",
    description:
      "Every milestone comes with the specific certifications you need to earn credibility and open doors.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#e0e7ff_0%,transparent_70%)]" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Sparkles size={14} />
              MajorGBN Enterprise Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Enterprise Intelligence.{" "}
              <span className="text-indigo-600">Three Powerful Modules.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              AI-driven staff classification and career roadmapping — plus a forensic B2B portal for corporate excess bank charges recovery, benchmarked against the CBN Guide to Bank Charges and BOFIA Act.
            </p>

            {/* 3-module pill summary */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "AI Staff Classification", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
                { label: "Career Roadmapping", color: "bg-violet-50 border-violet-200 text-violet-700" },
                { label: "Forensic Recovery", color: "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold" },
              ].map(({ label, color }) => (
                <span key={label} className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}>{label}</span>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <Users size={16} />
                Start Staff Classification
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
              >
                <TrendingUp size={16} />
                Build My Career Roadmap
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/recovery"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <Scale size={16} />
                Recover Bank Overcharges
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Module 1 */}
      <section className="border-t border-slate-200 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Users size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Module 1: AI Staff Classification
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Input a staff member&apos;s psychographic profile and list of
                certifications. Our AI analyses the data across six industry
                verticals and returns the top three department fits — ranked and
                fully explained.
              </p>
              <ul className="mt-8 space-y-5">
                {features.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Run an Assessment <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Decorative sample output card */}
            <div className="mt-12 lg:mt-0">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                  Sample Output
                </p>
                {[
                  {
                    rank: 1,
                    dept: "Data Science & AI",
                    industry: "Technology & Software Engineering",
                    match: 96,
                  },
                  {
                    rank: 2,
                    dept: "Risk Management",
                    industry: "Banking & Financial Services",
                    match: 88,
                  },
                  {
                    rank: 3,
                    dept: "Fintech Compliance",
                    industry: "Fintech & Digital Payments",
                    match: 81,
                  },
                ].map(({ rank, dept, industry, match }) => (
                  <div
                    key={rank}
                    className="mb-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 last:mb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        {rank}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {dept}
                        </p>
                        <p className="text-xs text-slate-500">{industry}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600">
                      {match}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module 2 */}
      <section className="border-t border-slate-200 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Decorative sample timeline card */}
            <div className="order-last mt-12 lg:order-first lg:mt-0">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-violet-600">
                  Sample Roadmap
                </p>
                {[
                  {
                    time: "Year 1–2",
                    milestone: "Foundation & Credentialing",
                    cert: "AWS Solutions Architect",
                  },
                  {
                    time: "Year 3–5",
                    milestone: "Leadership & Strategy",
                    cert: "PMP + CISM",
                  },
                  {
                    time: "Year 6–10",
                    milestone: "Executive Positioning",
                    cert: "TOGAF + MBA",
                  },
                ].map(({ time, milestone, cert }, i) => (
                  <div key={time} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      {i < 2 && (
                        <div className="mt-1 w-0.5 flex-1 bg-violet-200" />
                      )}
                    </div>
                    <div className="pb-6 last:pb-0">
                      <p className="text-xs font-semibold text-violet-600">
                        {time}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {milestone}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Certification: {cert}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Module 2: Strategic Career Partner
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Describe your current role and define your target — in 1 to 15
                years. Our AI builds a phased, milestone-driven career roadmap
                with the exact certifications required at every stage.
              </p>
              <ul className="mt-8 space-y-5">
                {roadmapFeatures.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link
                  href="/roadmap"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
                >
                  Build My Roadmap <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module 3: Recovery */}
      <section className="border-t border-slate-200 bg-slate-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Scale size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Module 3: Forensic Recovery Portal
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-400">
                A secure B2B portal for corporate organisations to request forensic audits and recover illegitimate bank deductions — excess interest, COT, and LC charges — benchmarked against the CBN Guide to Bank Charges and BOFIA Act.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: ShieldCheck, text: "Zero-Risk: 30% success fee, charged only on recovery" },
                  { icon: Search, text: "Forensic line-by-line analysis of all bank charges" },
                  { icon: Banknote, text: "Typical recoveries from ₦800K to ₦150M+" },
                  { icon: CircleCheck, text: "CBN & BOFIA compliant · NDPA 2023 data protection" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate-300">
                    <Icon size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    {text}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/recovery" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500">
                  Access Recovery Portal <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Decorative card */}
            <div className="mt-12 lg:mt-0">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-500">Zero-Risk Model</p>
                <p className="mb-6 text-2xl font-black text-white">No Recovery. No Fee.</p>
                {[
                  { band: "₦50M – ₦200M", range: "₦800K – ₦8M", time: "4–6 wks" },
                  { band: "₦200M – ₦1B", range: "₦5M – ₦40M", time: "6–10 wks" },
                  { band: "₦1B – ₦5B", range: "₦25M – ₦150M", time: "8–12 wks" },
                  { band: "Above ₦5B", range: "Custom Scoped", time: "10–16 wks" },
                ].map(({ band, range, time }) => (
                  <div key={band} className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 last:mb-0">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">{band}</p>
                      <p className="text-sm font-bold text-emerald-400">{range}</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">{time}</span>
                  </div>
                ))}
                <p className="mt-4 text-center text-xs text-slate-500">30% success fee on recovered amount only.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} MajorGBN Enterprise Platform. Built with Claude AI &amp; Next.js.
          </p>
        </div>
      </footer>
    </div>
  );
}
