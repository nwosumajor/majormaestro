import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Scale,
  Search,
  Banknote,
  CircleCheck,
  Users,
  TrendingUp,
  Route,
  BrainCircuit,
  Lock,
  Clock,
  HeartHandshake,
} from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import TrackedLink from "@/components/TrackedLink";

const RECOVERY_BANDS = [
  { band: "₦50M – ₦200M", range: "₦800K – ₦8M", time: "4–6 wks" },
  { band: "₦200M – ₦1B", range: "₦5M – ₦40M", time: "6–10 wks" },
  { band: "₦1B – ₦5B", range: "₦25M – ₦150M", time: "8–12 wks" },
  { band: "Above ₦5B", range: "Custom Scoped", time: "10–16 wks" },
];

const RECOVERY_POINTS = [
  { icon: Search, text: "Line-by-line forensic audit of every bank charge" },
  { icon: Scale, text: "Benchmarked to the CBN Guide to Bank Charges & BOFIA Act" },
  { icon: ShieldCheck, text: "Zero-risk — 30% success fee, charged only on recovery" },
  { icon: Lock, text: "NDPA 2023 protected · NDA executed before disclosure" },
];

const AI_TOOLS = [
  {
    icon: Users,
    title: "HR Staff Classification",
    desc: "Classify staff into best-fit departments — one person at a time, or a whole team from a spreadsheet. Ranked, scored, and explained.",
    href: "/classify",
    cta: "Classify staff",
  },
  {
    icon: Route,
    title: "Strategic Career Roadmap",
    desc: "Define your current and target roles; get a phased, milestone-driven plan with the exact certifications needed at each stage.",
    href: "/roadmap",
    cta: "Build a roadmap",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink">
        {/* grid texture + emerald glow */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-600/20 blur-[120px]" />

        <Container className="relative py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="gbn-rise mb-6 flex justify-center" style={{ animationDelay: "0ms" }}>
              <Badge tone="light">
                <ShieldCheck size={13} />
                CBN &amp; BOFIA Forensic Recovery · NDPA 2023
              </Badge>
            </div>

            <h1
              className="gbn-rise font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Recover what your bank{" "}
              <span className="text-accent-bright">quietly took.</span>
            </h1>

            <p
              className="gbn-rise mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300"
              style={{ animationDelay: "160ms" }}
            >
              MajorGBN runs forensic audits of corporate bank accounts to recover illegitimate
              charges — excess interest, COT and LC deductions — benchmarked against the{" "}
              <span className="font-semibold text-white">CBN Guide to Bank Charges</span> and the{" "}
              <span className="font-semibold text-white">BOFIA Act</span>.
            </p>

            <div
              className="gbn-rise mx-auto mt-8 w-fit rounded-2xl border border-white/10 bg-white/5 px-8 py-5 backdrop-blur-sm"
              style={{ animationDelay: "220ms" }}
            >
              <p className="font-display text-2xl font-bold text-white">No Recovery. No Fee.</p>
              <p className="mt-1 text-sm text-slate-400">
                Our forensic team works on a{" "}
                <span className="font-semibold text-accent-bright">30% success fee</span> — charged
                only on what we recover for you. Zero upfront cost.
              </p>
            </div>

            <div
              className="gbn-rise mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              style={{ animationDelay: "300ms" }}
            >
              <TrackedLink href="/recovery" event="cta_click" label="hero_recovery" variant="primary" size="lg">
                <Scale size={16} />
                Recover Bank Overcharges
                <ArrowRight size={16} />
              </TrackedLink>
              <TrackedLink href="/recovery#estimator" event="cta_click" label="hero_estimate" variant="outlineLight" size="lg">
                <Banknote size={16} />
                Estimate My Recovery
              </TrackedLink>
            </div>
          </div>
        </Container>

        {/* compliance strip */}
        <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <Container className="py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium text-slate-400">
              {[
                "CBN Guide to Bank Charges 2017 (as amended)",
                "BOFIA Act 2020",
                "NDPA 2023 Compliant",
                "CAC Registered",
                "AES-256 Encrypted",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CircleCheck size={12} className="text-accent-bright" />
                  {item}
                </span>
              ))}
            </div>
          </Container>
        </div>
      </section>

      {/* ── PROOF STRIP ──────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-slate-50">
        <Container className="py-8">
          <dl className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              { stat: "₦800K–₦150M+", label: "Typical recovery range" },
              { stat: "4–16 wks", label: "Complaint to recovery" },
              { stat: "30%", label: "Success fee — billed only on recovery" },
              { stat: "6-year", label: "BOFIA recovery window" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <dt className="font-figure text-2xl font-bold text-ink sm:text-3xl">{stat}</dt>
                <dd className="mt-1 text-xs leading-tight text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </div>

      {/* ── FLAGSHIP: FORENSIC RECOVERY ──────────────────────── */}
      <Section surface="white">
        <Container>
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <Badge tone="accent">Flagship Service</Badge>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Banks overcharge. We prove it. We recover it.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Nigerian banks routinely apply charges that exceed CBN-approved rates — and most
                corporates never notice. Our forensic accountants audit your full banking history
                and quantify every naira of illegitimate deduction, with documentary evidence for
                each claim.
              </p>
              <ul className="mt-8 space-y-3.5">
                {RECOVERY_POINTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon size={15} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button href="/recovery#intake" variant="primary" size="lg">
                  Lodge a Complaint <ArrowRight size={16} />
                </Button>
                <Button href="/recovery" variant="outline" size="lg">
                  Explore the Recovery Portal
                </Button>
              </div>
            </div>

            {/* recovery-range card */}
            <div className="mt-12 lg:mt-0">
              <div className="rounded-2xl border border-slate-200 bg-ink p-8 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-bright">
                  Estimated Recovery
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-white">By turnover band</p>
                <div className="mt-6 space-y-2">
                  {RECOVERY_BANDS.map(({ band, range, time }) => (
                    <div
                      key={band}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-300">{band}</p>
                        <p className="font-figure text-sm font-bold text-accent-bright">{range}</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                        <Clock size={11} />
                        {time}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-slate-500">
                  Ranges reflect historical audit outcomes against CBN benchmarks. 30% success fee
                  on recovered amounts only.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── AI TOOLS (secondary) ─────────────────────────────── */}
      <Section surface="slate" id="ai-tools">
        <Container>
          <SectionHeading
            eyebrow="Also on the platform"
            title="AI tools for teams & careers"
            lede="Beyond recovery, MajorGBN puts two AI decision tools in your hands — free to try."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {AI_TOOLS.map(({ icon: Icon, title, desc, href, cta }) => (
              <div
                key={title}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-ink/20 hover:shadow-md"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white">
                  <Icon size={22} />
                </span>
                <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{desc}</p>
                <div className="mt-6">
                  <Button href={href} variant="outline" size="md">
                    {cta} <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── GICN (youth / NGO arm) ───────────────────────────── */}
      <Section surface="white">
        <Container>
          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-accent-soft p-8 sm:p-10">
            <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div>
                <Badge tone="accent"><HeartHandshake size={13} /> Global Impact Christian Network</Badge>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Our youth &amp; NGO arm — GICN</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Scholarships, leadership conferences, Christian camps, and academic &amp; talent competitions for young people. Register a child, partner as a school, or sponsor a student.
                </p>
              </div>
              <div className="mt-5 flex shrink-0 flex-wrap gap-3 lg:mt-0">
                <Button href="/gicn" variant="primary" size="lg">Explore GICN <ArrowRight size={16} /></Button>
                <Button href="/gicn/sponsor" variant="outline" size="lg">Sponsor a child</Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute -bottom-32 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-emerald-600/15 blur-[120px]" />
        <Container className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <BrainCircuit size={28} className="mx-auto mb-5 text-accent-bright" />
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Find out what your bank owes you — before it&apos;s statute-barred.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-300">
              Under BOFIA 2020, overcharges are only recoverable within a 6-year window. Start your
              forensic audit today. No recovery, no fee.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/recovery#intake" variant="primary" size="lg">
                <ShieldCheck size={16} />
                Lodge a Complaint
                <ArrowRight size={16} />
              </Button>
              <Button href="/recovery#estimator" variant="outlineLight" size="lg">
                Estimate My Recovery
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-ink py-10">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="MajorGBN" width={32} height={32} className="h-8 w-8 object-contain" />
              <span className="font-display text-base font-bold text-white">MajorGBN</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <Link href="/recovery" className="hover:text-white">Recovery Portal</Link>
              <Link href="/recovery/track" className="hover:text-white">Track a Case</Link>
              <Link href="/classify" className="hover:text-white">HR Staff Classification</Link>
              <Link href="/roadmap" className="hover:text-white">Career Roadmap</Link>
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            &copy; {new Date().getFullYear()} MajorGBN Enterprise Platform · Forensic Recovery Division.
            All communications are protected under NDA and the Nigeria Data Protection Act 2023.
          </p>
        </Container>
      </footer>
    </div>
  );
}
