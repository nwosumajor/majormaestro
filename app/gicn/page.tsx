import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap, Users, Tent, Brain, Music, BookOpen, HeartHandshake, ArrowRight, Sparkles, Calendar, MapPin,
} from "lucide-react";
import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { PROGRAM_TYPE_LABELS, type ProgramType } from "@/lib/gicn";

export const metadata: Metadata = {
  title: "GICN — Global Impact Christian Network",
  description:
    "GICN runs scholarships, leadership conferences, Christian camps, and academic & talent competitions for young people. Register a child, partner as a school, or sponsor a student.",
};

const PROGRAM_CARDS: { type: ProgramType; icon: React.ElementType; blurb: string }[] = [
  { type: "SCHOLARSHIP", icon: GraduationCap, blurb: "Funding that keeps promising students in school." },
  { type: "LEADERSHIP_CONFERENCE", icon: Users, blurb: "Equipping the next generation of Christian leaders." },
  { type: "CHRISTIAN_CAMP", icon: Tent, blurb: "Faith, friendship and growth in a safe environment." },
  { type: "INTELLECTUAL_COMPETITION", icon: Brain, blurb: "Stretching young minds through healthy competition." },
  { type: "TALENT_SHOW", icon: Music, blurb: "A stage for God-given gifts to shine." },
  { type: "ACADEMIC_COMPETITION", icon: BookOpen, blurb: "Rewarding academic excellence and effort." },
];

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export const dynamic = "force-dynamic";

export default async function GicnLandingPage() {
  const openPrograms = db
    ? await db.program.findMany({
        where: { status: "OPEN" },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: { id: true, title: true, type: true, startsAt: true, location: true },
      })
    : [];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-600/20 blur-[120px]" />
        <Container className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <Badge tone="light"><Sparkles size={13} /> Global Impact Christian Network</Badge>
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Raising a generation of <span className="text-accent-bright">impact &amp; faith.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              GICN is the youth &amp; NGO arm of MajorGBN — running scholarships, leadership conferences, Christian camps, and academic &amp; talent competitions for young people across Nigeria.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/gicn/sponsor" variant="primary" size="lg"><HeartHandshake size={16} /> Sponsor a child</Button>
              <Button href="/gicn/register" variant="outlineLight" size="lg">Register your child / school <ArrowRight size={16} /></Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Programs */}
      <Section surface="white">
        <Container>
          <SectionHeading eyebrow="Our programmes" title="How we invest in young people" lede="Every programme is built to nurture character, faith, and excellence." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAM_CARDS.map(({ type, icon: Icon, blurb }) => (
              <div key={type} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-ink/20 hover:shadow-md">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span>
                <h3 className="font-display text-lg font-semibold text-ink">{PROGRAM_TYPE_LABELS[type]}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{blurb}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Upcoming open programs */}
      {openPrograms.length > 0 && (
        <Section surface="slate">
          <Container>
            <SectionHeading eyebrow="Open now" title="Upcoming programmes" lede="Register a participant into any open programme." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openPrograms.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Badge tone="accent">{PROGRAM_TYPE_LABELS[p.type as ProgramType] ?? p.type}</Badge>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Calendar size={12} /> {fmtDate(p.startsAt)}{p.location ? <> · <MapPin size={12} /> {p.location}</> : null}</p>
                  <div className="mt-4">
                    <Button href="/gicn/programs" variant="outline" size="sm">Register <ArrowRight size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-ink">
        <Container className="relative py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Be part of the impact.</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-300">Sponsor a student's scholarship or camp place, or register the young people in your care.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/gicn/sponsor" variant="primary" size="lg"><HeartHandshake size={16} /> Sponsor now</Button>
              <Button href="/gicn/register" variant="outlineLight" size="lg">Create an account</Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
