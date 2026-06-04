import type { Metadata } from "next";
import { User, Users, ArrowRight, ShieldCheck, FileSpreadsheet, Lock } from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "HR Staff Classification",
  description:
    "Classify staff into best-fit departments with AI — one person at a time, or a whole team from a spreadsheet.",
};

const OPTIONS = [
  {
    icon: User,
    eyebrow: "One person",
    title: "Individual Classification",
    desc: "Enter a single person's psychological, mental, social and environmental profile plus their certifications, and get the top 3 best-fit departments — ranked, scored, and explained — instantly.",
    points: ["Instant result", "Top 3 departments with reasoning", "Confidence scores + skill gaps"],
    href: "/assessment",
    cta: "Classify an individual",
  },
  {
    icon: Users,
    eyebrow: "A whole team",
    title: "Bulk Classification",
    desc: "Upload a staff spreadsheet, pick the target positions (including your own custom roles), and we'll classify everyone against those roles — each placement justified by their attributes and certifications.",
    points: ["Excel/CSV upload", "Choose target positions", "Ranked placements + CSV/xlsx export"],
    href: "/client/bulk-classify",
    cta: "Classify in bulk",
  },
];

export default function ClassifyHubPage() {
  return (
    <Section surface="slate" bordered={false} className="min-h-[80vh]">
      <Container className="max-w-5xl">
        <div className="text-center">
          <Badge tone="accent">
            <ShieldCheck size={13} /> AI-Powered HR
          </Badge>
        </div>
        <SectionHeading
          eyebrow="HR Staff Classification"
          title="How do you want to classify?"
          lede="Choose individual classification for a single person, or bulk classification to process an entire team from one spreadsheet."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {OPTIONS.map(({ icon: Icon, eyebrow, title, desc, points, href, cta }) => (
            <div
              key={title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-ink/20 hover:shadow-md"
            >
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white">
                <Icon size={22} />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
              <ul className="mt-5 space-y-2">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                    <FileSpreadsheet size={14} className="shrink-0 text-accent" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button href={href} variant="primary" size="lg">
                  {cta} <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <Lock size={12} /> Both tools require a free MajorGBN sign-in — you&apos;ll be prompted if you&apos;re not already signed in.
        </p>
      </Container>
    </Section>
  );
}
