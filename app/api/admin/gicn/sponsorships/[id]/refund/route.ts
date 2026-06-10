import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { refundSponsorship } from "@/lib/sponsorship";
import { sendSponsorshipRefund } from "@/lib/email";

// Refund a paid sponsorship via Paystack — admin, gicn.manage (2FA-gated).
// Race-safe + idempotent (see refundSponsorship). Emails the sponsor on success.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  const { id } = await ctx.params;

  const result = await refundSponsorship(id, gate.admin.email);

  if (result.outcome === "refunded") {
    if (result.email) {
      const e = result.email;
      after(() =>
        sendSponsorshipRefund({ sponsorEmail: e.sponsorEmail, sponsorName: e.sponsorName, amountKobo: e.amountKobo, programTitle: e.programTitle, reference: e.reference }).catch((err) =>
          console.error("[gicn-refund] email error:", err)
        )
      );
    }
    return NextResponse.json({ success: true, status: "refunded" });
  }
  if (result.outcome === "already_refunded") return NextResponse.json({ success: true, status: "refunded", note: "Already refunded." });

  const messages: Record<string, { msg: string; code: number }> = {
    not_found: { msg: "Sponsorship not found.", code: 404 },
    not_paid: { msg: "Only a paid sponsorship can be refunded.", code: 409 },
    no_reference: { msg: "This sponsorship has no payment reference to refund.", code: 409 },
    unconfigured: { msg: "Payments are not configured.", code: 503 },
    unavailable: { msg: "Service temporarily unavailable.", code: 503 },
    provider_error: { msg: result.error ?? "The payment provider rejected the refund.", code: 502 },
  };
  const m = messages[result.outcome] ?? { msg: "Refund failed.", code: 500 };
  return NextResponse.json({ error: m.msg }, { status: m.code });
}
