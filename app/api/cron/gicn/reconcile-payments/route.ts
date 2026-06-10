import { NextRequest, NextResponse, after } from "next/server";
import { reconcilePendingSponsorships } from "@/lib/sponsorship";
import { sendSponsorshipConfirmation } from "@/lib/email";

/**
 * Reconcile stale `pending` GICN sponsorships against Paystack:
 *   - confirms real successes whose webhook + callback both missed,
 *   - marks failed/abandoned/reversed (and long-stuck) transactions as `failed`,
 * so the sponsorship ledger never drifts.
 *
 * Scheduler-agnostic (GET or POST; CRON_SECRET via Bearer or X-Cron-Secret).
 * Driven every ~30 min by .github/workflows/gicn-reconcile.yml (Hobby's two
 * vercel.json crons are already in use). No-op while Paystack is unconfigured.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkCronAuth(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (req.headers.get("authorization") === `Bearer ${expected}`) return true;
  if (req.headers.get("x-cron-secret") === expected) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await reconcilePendingSponsorships();

  // Email sponsors whose payment we just confirmed via reconciliation.
  if (summary.emails.length) {
    const emails = summary.emails;
    after(async () => {
      for (const e of emails) {
        await sendSponsorshipConfirmation({ ...e, paid: true }).catch((err) =>
          console.error("[reconcile-payments] email error:", err)
        );
      }
    });
  }

  // Note: never spread `summary` into the response — its `emails` carry BigInt.
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

export async function GET(req: NextRequest) {
  return POST(req);
}
