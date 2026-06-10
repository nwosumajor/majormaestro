import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { reconcilePendingSponsorships } from "@/lib/sponsorship";
import { sendSponsorshipConfirmation } from "@/lib/email";

// Manually reconcile stale pending sponsorships against Paystack — admin,
// gicn.manage. Same logic as the cron, on demand. Emails any newly-confirmed
// sponsors and audits the run.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;

  const summary = await reconcilePendingSponsorships();

  if (summary.emails.length) {
    const emails = summary.emails;
    after(async () => {
      for (const e of emails) {
        await sendSponsorshipConfirmation({ ...e, paid: true }).catch((err) => console.error("[admin-reconcile] email error:", err));
      }
    });
  }

  await recordAudit({
    action: "gicn_sponsorship_reconcile",
    actorLabel: gate.admin.email,
    targetType: "Sponsorship",
    metadata: { configured: summary.configured, checked: summary.checked, confirmed: summary.confirmed, failed: summary.failed },
  });

  return NextResponse.json({
    ok: true,
    configured: summary.configured,
    checked: summary.checked,
    confirmed: summary.confirmed,
    failed: summary.failed,
    skipped: summary.skipped,
    emailed: summary.emails.length,
  });
}
