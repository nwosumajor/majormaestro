import {
  ShieldCheck,
  Lock,
  Scale,
  Search,
  FileBarChart2,
  Building2,
  BadgeCheck,
  FolderOpen,
  Handshake,
  ArrowRight,
  CircleCheck,
  AlertTriangle,
  Banknote,
  ChevronRight,
  Factory,
  ShoppingCart,
  ClipboardList,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import IntakeForm from "@/components/IntakeForm";
import RefLandingTracker from "@/components/RefLandingTracker";
import RecoveryTools from "@/components/RecoveryTools";
import CaseStudies from "@/components/CaseStudies";
import FAQAccordion from "@/components/FAQAccordion";
import LeadMagnet from "@/components/LeadMagnet";
import WhatsAppCTA from "@/components/WhatsAppCTA";

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: "CBN & BOFIA Compliant", desc: "All analyses are benchmarked against the Central Bank of Nigeria Guide to Bank Charges and BOFIA Act." },
  { icon: Lock, label: "NDPA 2023 Protected", desc: "Your financial data is handled under strict Nigeria Data Protection Act 2023 and a mutual NDA." },
  { icon: Scale, label: "Zero-Risk Partnership", desc: "We only earn when you recover. Our 30% success fee is charged exclusively on the amount recovered." },
];

const CHARGE_TYPES = [
  "Excess interest charges above CBN approved rates",
  "Unauthorised COT (Commission on Turnover) deductions",
  "Inflated Letter of Credit (LC) charges",
  "Unlawful account maintenance fees",
  "Excess tenured loan interest overcharges",
  "Duplicate or phantom transaction charges",
];

const PROCESS_STEPS = [
  {
    icon: Handshake,
    step: "01",
    title: "Engagement & Authorisation",
    desc: "We execute a mutual NDA and Letter of Engagement. You issue a Letter of Authority authorising us to act as your financial recovery agents.",
  },
  {
    icon: FolderOpen,
    step: "02",
    title: "Document Collection",
    desc: "You securely provide bank statements, facility letters, and charge schedules. Our team sets up an encrypted data room for all materials.",
  },
  {
    icon: Search,
    step: "03",
    title: "Forensic Analysis",
    desc: "Our forensic accountants run a line-by-line audit against the CBN Guide to Bank Charges and BOFIA Act schedules to identify all overcharges.",
  },
  {
    icon: FileBarChart2,
    step: "04",
    title: "Findings Report",
    desc: "We produce a detailed Forensic Findings Report quantifying all identified excess charges with documentary evidence for each claim.",
  },
  {
    icon: Building2,
    step: "05",
    title: "Bank Engagement",
    desc: "We formally present findings to the bank and negotiate recovery on your behalf, escalating to the CBN Consumer Protection Department where necessary.",
  },
  {
    icon: BadgeCheck,
    step: "06",
    title: "Recovery & Settlement",
    desc: "Recovered funds are credited directly to your corporate account. Our 30% success fee is invoiced exclusively on the recovered amount.",
  },
];

const SECTOR_LINKS = [
  { href: "/recovery/manufacturing", icon: Factory, label: "Manufacturing", desc: "High COT & overdraft exposure" },
  { href: "/recovery/fmcg", icon: ShoppingCart, label: "FMCG & Distribution", desc: "LC & SWIFT charge recovery" },
  { href: "/recovery/banking", icon: Building2, label: "Banking & Finance", desc: "Correspondent bank charges" },
];

const QUICK_NAV = [
  { href: "#estimator", label: "Estimate Recovery" },
  { href: "#prescreener", label: "AI Pre-Screen" },
  { href: "#quiz", label: "Eligibility Quiz" },
  { href: "#cbn-checker", label: "CBN Rate Checker" },
  { href: "#case-studies", label: "Case Studies" },
  { href: "#faq", label: "FAQ" },
  { href: "#intake", label: "Lodge Complaint" },
];

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  // Durable attribution: explicit ?ref, else the first-touch gbn_ref cookie.
  const jar = await cookies();
  const refCandidate = ref?.trim() || jar.get("gbn_ref")?.value;
  let referralCode: string | undefined;
  let referrerName: string | undefined;
  if (db && refCandidate) {
    const r = await db.referral.findUnique({
      where: { code: refCandidate },
      select: { code: true, referrerName: true },
    });
    if (r) {
      referralCode = r.code;
      referrerName = r.referrerName;
    }
  }

  return (
    <div className="flex flex-col">
      {referralCode && <RefLandingTracker code={referralCode} />}

      {/* ── STATUTE URGENCY BANNER ──────────────────────────── */}
      <div className="bg-red-700 px-4 py-2.5 text-center text-sm text-white">
        <span className="font-bold">Time-sensitive:</span> Under BOFIA Act 2020, overcharges are only recoverable within a{" "}
        <span className="font-bold underline">6-year window</span>. Charges older than 6 years are statute-barred. Start your audit before eligible charges expire.{" "}
        <a href="#intake" className="ml-2 inline-flex items-center gap-1 font-bold underline hover:text-red-200">
          Lodge Now <ArrowRight size={13} />
        </a>
      </div>

      {/* ── REFERRAL BANNER ─────────────────────────────────── */}
      {referrerName && (
        <div className="bg-accent px-4 py-2 text-center text-sm text-white">
          <Gift size={13} className="mr-1 inline" />
          You were referred by <span className="font-bold">{referrerName}</span> — referred companies receive{" "}
          <span className="font-semibold underline">priority forensic review</span>.
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-400">
              <ShieldCheck size={14} />
              CBN & BOFIA Certified Forensic Recovery
            </div>

            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Recover What Your Bank{" "}
              <span className="text-accent-bright">Owes You</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              MajorGBN conducts forensic audits of corporate bank accounts to identify and recover illegitimate charges — excess interest, COT, and LC deductions — based on the{" "}
              <span className="font-semibold text-white">CBN Guide to Bank Charges</span> and the{" "}
              <span className="font-semibold text-white">BOFIA Act</span>.
            </p>

            <div className="mx-auto mt-8 w-fit rounded-2xl border border-white/10 bg-white/5 px-8 py-5 backdrop-blur-sm">
              <p className="text-2xl font-black text-white">No Recovery. No Fee.</p>
              <p className="mt-1 text-sm text-slate-400">
                Our forensic team works on a{" "}
                <span className="font-bold text-emerald-400">30% success fee</span> — charged only on what we recover for you. Zero upfront cost.
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#estimator" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 transition-colors">
                <Banknote size={16} />Estimate Your Recovery
                <ChevronRight size={16} />
              </a>
              <a href="#intake" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                <ShieldCheck size={16} />Lodge a Complaint
                <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-blue-950/60 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium text-blue-300">
              {["CBN Guide to Bank Charges 2017 (as amended)", "BOFIA Act 2020", "NDPA 2023 Compliant", "CAC Registered", "AES-256 Encrypted"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CircleCheck size={12} className="text-emerald-500" />{item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK NAV ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
            {QUICK_NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                {n.label}
              </a>
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Link href="/recovery/track" className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors sm:flex">
                <ClipboardList size={12} /> Track Case
              </Link>
              <Link href="/recovery/refer" className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors sm:flex">
                <Gift size={12} /> Refer &amp; Earn
              </Link>
              <a href="#intake" className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-accent-bright">
                <ShieldCheck size={12} /> Lodge Now
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── WHAT WE RECOVER ─────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Scope of Recovery</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Banks Overcharge. We Prove It. We Recover It.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Nigerian banks routinely apply charges that exceed CBN-approved rates. Most corporate clients never notice. Our forensic team specialises in identifying every naira of illegitimate deduction across your full banking history.
              </p>
              <ul className="mt-6 space-y-2.5">
                {CHARGE_TYPES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 space-y-4 lg:mt-0">
              {TRUST_SIGNALS.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-emerald-400">
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTOR LINKS ────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-slate-500">Sector-Specific Recovery Guides</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SECTOR_LINKS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-emerald-400 group-hover:bg-blue-800 transition-colors">
                  <s.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-700 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TOOLS (tabbed — estimator / pre-screen / quiz / CBN checker) ── */}
      <RecoveryTools />

      {/* ── CASE STUDIES ─────────────────────────────────────── */}
      <section id="case-studies" className="bg-white py-16 sm:py-24 border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Track Record</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Recent Recovery Cases
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Anonymised summaries of completed forensic audit engagements. All figures represent funds recovered and credited back to clients.
            </p>
          </div>
          <CaseStudies />
        </div>
      </section>

      {/* ── 6-STEP PROCESS ──────────────────────────────────── */}
      <section className="bg-slate-50 py-16 sm:py-24 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Our Process</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Six Steps from Complaint to Recovery
            </h2>
            <p className="mt-3 text-base text-slate-600">
              A structured, transparent process — from initial engagement to funds arriving in your account.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROCESS_STEPS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950 text-emerald-400 group-hover:bg-blue-900 transition-colors">
                    <Icon size={22} />
                  </div>
                  <span className="text-3xl font-black text-slate-100 group-hover:text-blue-100 transition-colors select-none">
                    {step}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 px-6 py-4 text-center">
            <p className="text-sm text-blue-800">
              <span className="font-bold">Average end-to-end timeline: 4 – 16 weeks</span>, depending on turnover band, number of banks, and statement availability. We keep you informed at every step.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="bg-white py-16 sm:py-24 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Common Questions</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ── LEAD MAGNET ──────────────────────────────────────── */}
      <section className="bg-slate-50 py-16 sm:py-24 border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <LeadMagnet />
        </div>
      </section>

      {/* ── INTAKE FORM ─────────────────────────────────────── */}
      <section id="intake" className="bg-ink py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-500">Secure Portal</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Lodge Your Forensic Audit Complaint
            </h2>
            <p className="mt-3 text-base text-slate-400">
              Complete the secure intake form below. A forensic specialist will contact you within{" "}
              <span className="font-semibold text-white">24 business hours</span> to confirm receipt and schedule your engagement call.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              {[
                { icon: Lock, label: "AES-256 Encrypted" },
                { icon: ShieldCheck, label: "NDPA 2023 Compliant" },
                { icon: ArrowRight, label: "NDA Executed Before Disclosure" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon size={12} className="text-emerald-500" />{label}
                </span>
              ))}
            </div>
          </div>

          <IntakeForm referralCode={referralCode} referrerName={referrerName} />

          <p className="mt-6 text-center text-xs text-slate-600">
            Prefer to speak first?{" "}
            <span className="font-semibold text-emerald-400">
              Email: forensics@majormaestro.com
            </span>{" "}
            · All initial consultations are strictly confidential and free of charge.
          </p>
        </div>
      </section>

      {/* ── WHATSAPP FLOATING CTA ───────────────────────────── */}
      <WhatsAppCTA />

    </div>
  );
}
