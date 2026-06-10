import { after } from "next/server";
import type { Metadata } from "next";
import { CheckCircle2, Clock, AlertCircle, HeartHandshake } from "lucide-react";
import { Container } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { confirmSponsorshipByReference } from "@/lib/sponsorship";
import { sendSponsorshipConfirmation } from "@/lib/email";

export const metadata: Metadata = { title: "Sponsorship — payment status", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SponsorCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref ?? "";

  let outcome: "paid" | "pending" | "missing" | "error" = "missing";
  if (reference) {
    try {
      const result = await confirmSponsorshipByReference(reference);
      if (result.justConfirmed && result.email) {
        const e = result.email;
        after(() => sendSponsorshipConfirmation({ ...e, paid: true }).catch(() => {}));
      }
      outcome = result.outcome === "paid" ? "paid" : result.outcome === "pending" ? "pending" : "error";
    } catch {
      outcome = "error";
    }
  }

  const ui = {
    paid: {
      icon: <CheckCircle2 size={40} className="mx-auto mb-3 text-accent" />,
      title: "Payment received — thank you!",
      body: "Your sponsorship is confirmed. A receipt is on its way, and you'll see exactly which programme and beneficiaries your gift supports.",
    },
    pending: {
      icon: <Clock size={40} className="mx-auto mb-3 text-amber-500" />,
      title: "We're confirming your payment",
      body: "Your payment is being verified. This usually takes a moment — we'll email you as soon as it's confirmed. You can safely close this page.",
    },
    missing: {
      icon: <AlertCircle size={40} className="mx-auto mb-3 text-slate-400" />,
      title: "No payment reference found",
      body: "We couldn't find a payment to confirm. If you just paid, check your email for confirmation, or contact us.",
    },
    error: {
      icon: <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />,
      title: "We couldn't confirm this payment yet",
      body: "If money left your account, don't worry — it's tracked by reference and our team will reconcile it. Please contact us if you have any concern.",
    },
  }[outcome];

  return (
    <main className="min-h-screen bg-slate-50 py-16">
      <Container className="max-w-xl">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center"><Badge tone="accent"><HeartHandshake size={13} /> GICN Sponsorship</Badge></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {ui.icon}
          <h1 className="font-display text-xl font-semibold text-ink">{ui.title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{ui.body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/gicn" variant="primary" size="md">Back to GICN</Button>
            <Button href="/gicn/sponsor" variant="outline" size="md">Sponsor again</Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
