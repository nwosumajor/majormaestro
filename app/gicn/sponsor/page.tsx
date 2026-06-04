import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { Container } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import SponsorForm from "@/components/gicn/SponsorForm";

export const metadata: Metadata = {
  title: "Sponsor a child — GICN",
  description: "Sponsor a student's scholarship, camp place or programme through the Global Impact Christian Network.",
};

export default function GicnSponsorPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <Container className="max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center"><Badge tone="accent"><HeartHandshake size={13} /> GICN Sponsorship</Badge></div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Sponsor a young life</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            Your gift funds scholarships, camps and leadership programmes. Earmark a specific programme or give to the general fund — every naira is tracked in our sponsorship ledger.
          </p>
        </div>
        <SponsorForm />
      </Container>
    </main>
  );
}
