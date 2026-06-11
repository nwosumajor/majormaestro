import { Resend } from "resend";
import { CURRENT_MPR, lcCollateralMinRate, lcCollateralInterestOwed } from "@/lib/cbnCharges";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "MajorGBN <noreply@majormaestro.com>";
const INTERNAL_TEAM = process.env.INTERNAL_NOTIFY_EMAIL ?? "nwosumajor@gmail.com";
const SUPPORT_EMAIL = "forensics@majormaestro.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_RE = /^(?:.+ <([^>]+)>|([^<>]+))$/;

export interface EmailConfigStatus {
  configured: boolean;
  fromValid: boolean;
  internalNotifyValid: boolean;
  problems: string[];
}

export function getEmailConfigStatus(): EmailConfigStatus {
  const problems: string[] = [];
  if (!process.env.RESEND_API_KEY) problems.push("RESEND_API_KEY is not set.");

  const fromMatch = FROM.match(FROM_RE);
  const fromAddress = fromMatch ? (fromMatch[1] ?? fromMatch[2]) : "";
  const fromValid = !!fromAddress && EMAIL_RE.test(fromAddress);
  if (!fromValid) problems.push(`RESEND_FROM_EMAIL "${FROM}" is malformed.`);

  const internalNotifyValid = EMAIL_RE.test(INTERNAL_TEAM);
  if (!internalNotifyValid) problems.push(`INTERNAL_NOTIFY_EMAIL "${INTERNAL_TEAM}" is malformed.`);

  return {
    configured: !!process.env.RESEND_API_KEY,
    fromValid,
    internalNotifyValid,
    problems,
  };
}

// Resend's SDK resolves (does NOT throw) on a rejected send — e.g. a suppressed
// recipient or validation error — returning { data: null, error }. Every send
// must go through this wrapper so a rejected send surfaces as a thrown error
// instead of being silently swallowed (and reported as success).
async function sendOrThrow(payload: Parameters<Resend["emails"]["send"]>[0]) {
  if (!resend) throw new Error("RESEND_API_KEY is not set.");
  const result = await resend.emails.send(payload);
  if (result.error) {
    throw new Error(`${result.error.name}: ${result.error.message}`);
  }
  return result;
}

export async function sendPlain(opts: { to: string; subject: string; html: string }) {
  return sendOrThrow({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
}

function brandHeader(title: string) {
  return `
    <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
      <p style="margin:0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">MajorGBN</p>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">${title}</p>
    </div>`;
}

function brandFooter() {
  return `
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;border-radius:0 0 12px 12px">
      <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
        MajorGBN Enterprise Platform &nbsp;·&nbsp; Forensic Recovery Division<br>
        All communications are protected under NDA and NDPA 2023.<br>
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none">${SUPPORT_EMAIL}</a>
      </p>
    </div>`;
}

// ─── Email change: confirm new address ────────────────────────────────────

export async function sendEmailChangeConfirmation(
  newEmail: string,
  oldEmail: string,
  verifyUrl: string
) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email change confirmation");
    return { skipped: true } as const;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Confirm your new email")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Hi,</p>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
        Someone signed in as <strong>${oldEmail}</strong> requested to change their email address to <strong>${newEmail}</strong>. Click below to confirm.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${verifyUrl}"
           style="display:inline-block;background:#1d4ed8;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px">
          Confirm new email
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8">If the button doesn't work, copy &amp; paste this URL:</p>
      <p style="margin:0 0 24px;font-size:11px;color:#475569;word-break:break-all;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0;font-family:monospace">${verifyUrl}</p>
      <p style="margin:0;font-size:12px;color:#94a3b8">
        This link is valid for 30 minutes and can only be used once. If you didn't request this change, ignore this email.
      </p>
    </div>
    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: newEmail,
    subject: "Confirm your new MajorGBN email address",
    html,
  });
  return { skipped: false } as const;
}

// ─── Magic Link: passwordless sign-in ─────────────────────────────────────

export async function sendMagicLink(toEmail: string, signInUrl: string) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping magic link email");
    // In dev, return so the verify URL can be surfaced via API response for testing.
    return { skipped: true } as const;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Sign in to MajorGBN")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Hi,</p>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
        Click the button below to sign in to your MajorGBN client portal. This link is valid for <strong>15 minutes</strong> and can only be used once.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${signInUrl}"
           style="display:inline-block;background:#10b981;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px">
          Sign in to MajorGBN
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8">If the button doesn't work, copy &amp; paste this URL:</p>
      <p style="margin:0 0 24px;font-size:11px;color:#475569;word-break:break-all;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0;font-family:monospace">${signInUrl}</p>
      <p style="margin:0;font-size:12px;color:#94a3b8">
        Didn't request this? You can safely ignore this email — without clicking the link, no one can access your account.
      </p>
    </div>
    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: toEmail,
    subject: "Your MajorGBN sign-in link",
    html,
  });
  return { skipped: false } as const;
}

// ─── Lead Magnet: Guide Email ──────────────────────────────────────────────

export async function sendLeadMagnetGuide(email: string, companyName?: string) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping lead magnet email");
    return;
  }

  const greeting = companyName ? `Hi ${companyName} team,` : "Hi,";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("The Corporate Treasurer's Handbook")}

    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
        Thank you for requesting <strong>10 Signs Your Bank Is Overcharging You</strong>. Here are the key insights from the guide — written specifically for Nigerian CFOs, treasurers, and finance directors.
      </p>

      <div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px">Quick Fact</p>
        <p style="margin:6px 0 0;font-size:14px;color:#1e3a8a;line-height:1.5">Under BOFIA Act 2020, overcharges are recoverable retrospectively for up to <strong>6 years</strong>. For most companies, this represents millions of naira in recoverable funds.</p>
      </div>

      <h2 style="margin:0 0 16px;font-size:17px;color:#0f172a">The 10 Signs Your Bank May Be Overcharging You</h2>

      ${[
        ["1. Account maintenance (CAMF) above ₦1 per mille (0.1%)", "Under the CBN Guide (§3.1), CAMF is capped at ₦1 per mille on qualifying current-account debits to third parties — it does NOT apply to savings accounts or to intra-bank/own-account transfers. Charges above the cap, or on non-qualifying debits, are recoverable."],
        ["2. Loan or overdraft interest above your agreed rate", "Lending interest is negotiable, not fixed by the CBN — there is no 'MPR + 7%' ceiling. An overcharge arises where the rate charged exceeds the rate in your offer/facility letter, where a rate change is applied without 10 business days' notice, or where interest is charged on an unauthorised overdraft."],
        ["3. LC confirmation fees above 0.5% of face value", "Under the Guide (§8.3), LC confirmation commission is capped at 0.5% of the LC value. LC establishment commission is 1% / 1.25% / 1.5% by tenor (§8.7) — these are one-off by tenor band, not 'per quarter'."],
        ["4. SWIFT/foreign-transfer commission above 0.5%", "There is no flat '$25' SWIFT cap. The bank may recover the actual SWIFT cost plus a commission of at most 0.5% on the transfer (§5.6). Commission above 0.5% — or undisclosed uplift — is recoverable."],
        ["5. Recurring 'facility review' or annual lending fees", "The Guide does not provide for a recurring annual facility-review fee — a repeating review charge is itself an overcharge. Permitted lending fees (management/processing) are one-off and capped at 2% in aggregate (§2.2)."],
        ["6. Penal interest above 1% flat per month", "On defaulted facilities, penal/default interest is capped at 1% flat per month on the unpaid amount for the period of default (§2.1.9) — 0.25% per month on foreign-currency facilities. Anything above this is recoverable."],
        ["7. Account maintenance applied per quarter or on every account", "CAMF accrues per qualifying debit, not as a flat 'per quarter' levy, and applies only to current accounts. Banks that apply it to savings accounts, to non-qualifying transfers, or as a recurring periodic charge are overcharging."],
        ["8. You have never had charges reversed after querying", "A refusal to reverse charges is strong evidence of systematic non-compliance — and escalation to the CBN is available."],
        ["9. You have never formally reviewed your charge schedule", "Most companies never conduct a forensic review. Banks rely on this inertia to sustain overcharging indefinitely."],
        ["10. You have been banking for 2+ years", "The longer the banking relationship, the larger the accumulated overcharge exposure — and the stronger the recovery case."],
      ].map(([title, body]) => `
        <div style="margin-bottom:16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f172a">${title}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5">${body}</p>
        </div>`).join("")}

      <div style="background:#0f172a;padding:20px;border-radius:10px;margin:24px 0;text-align:center">
        <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#ffffff">Ready to find out what you're owed?</p>
        <p style="margin:0 0 16px;font-size:13px;color:#94a3b8">No upfront fees. 30% success fee only on recovery.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com"}/recovery#intake"
           style="display:inline-block;background:#10b981;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px">
          Lodge a Complaint Now →
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;margin:0">
        You received this because you requested our free guide. No spam — this is the only email from this address.<br>
        Contact us: <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6">${SUPPORT_EMAIL}</a>
      </p>
    </div>

    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: email,
    subject: "Your Free Guide: 10 Signs Your Bank Is Overcharging You",
    html,
  });
}

// ─── Campaign: LC Cash-Collateral Interest Guide ──────────────────────────

export async function sendLcInterestGuide(
  email: string,
  opts?: { companyName?: string; coverNaira?: number; months?: number; mpr?: number }
) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping LC interest guide");
    return;
  }

  const { companyName, coverNaira, months, mpr } = opts ?? {};
  const greeting = companyName ? `Hi ${companyName} team,` : "Hi,";
  const rate = lcCollateralMinRate(mpr ?? CURRENT_MPR);
  const owed = lcCollateralInterestOwed(coverNaira ?? 0, months ?? 0, mpr ?? CURRENT_MPR);
  const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

  const personalised =
    owed > 0
      ? `<div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:18px 20px;margin-bottom:24px">
           <p style="margin:0;font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px">Based on the figures you entered</p>
           <p style="margin:8px 0 0;font-size:24px;font-weight:900;color:#047857">${naira(owed)}</p>
           <p style="margin:4px 0 0;font-size:13px;color:#065f46;line-height:1.5">is the <strong>minimum interest</strong> your bank may owe you on ${naira(coverNaira ?? 0)} of LC cover held for ${months} month${months === 1 ? "" : "s"}, at ${rate}% p.a. (30% of the ${mpr ?? CURRENT_MPR}% MPR). A forensic audit of your statements confirms the exact figure across every LC.</p>
         </div>`
      : "";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Letters of Credit: The Interest Your Bank Owes You")}

    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
        Most Nigerian importers don't realise it, but the cash you lodge as cover for a Letter of Credit is a <strong>special-purpose deposit</strong> — and your bank is obliged to pay you credit interest on it. Here's how the entitlement works and how to claim it.
      </p>

      ${personalised}

      <div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px">The Rule</p>
        <p style="margin:6px 0 0;font-size:14px;color:#1e3a8a;line-height:1.5">Cash cover locked as a special-purpose deposit must earn a minimum of <strong>30% of the MPR</strong> — about <strong>${rate}% p.a.</strong> at today's ${mpr ?? CURRENT_MPR}% MPR. This flows from the CBN Monetary, Credit, Foreign Trade &amp; Exchange Policy Guidelines (§3.2) and the Guide to Bank Charges, and is reaffirmed in the Bankers' Committee framework on FX-linked obligations.</p>
      </div>

      <h2 style="margin:0 0 16px;font-size:17px;color:#0f172a">What we audit on your Letters of Credit</h2>
      ${[
        ["Uncollected collateral interest", "We reconstruct the interest due on every cash-cover deposit at the 30%-of-MPR floor — for the full period each sum was held — and net off anything already paid. (Cover funded by a bank loan is excluded.)"],
        ["Offshore charges in SWIFT Field 71D", "Advising, amendment, confirmation, negotiation and transfer charges are recoverable from you only at actual cost. Undisclosed margins on correspondent-bank fees are recoverable."],
        ["'Pre-/post-negotiation' confirmation-line & refinancing fees", "These terms aren't recognised under CBN rules or UCP600. Where they were applied with a margin that never appeared on your offer letter, they are disputable."],
        ["FX differentials from bank delay", "You should not bear FX or penal/overdraft costs caused by the bank's own inaction or poor disclosure on settled LCs."],
      ].map(([title, body]) => `
        <div style="margin-bottom:16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0f172a">${title}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5">${body}</p>
        </div>`).join("")}

      <div style="background:#0f172a;padding:20px;border-radius:10px;margin:24px 0;text-align:center">
        <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#ffffff">Find out what your LCs are owed</p>
        <p style="margin:0 0 16px;font-size:13px;color:#94a3b8">No upfront fees. 30% success fee only on recovery. Recoverable up to 6 years back.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com"}/recovery/trade-finance"
           style="display:inline-block;background:#10b981;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px">
          Start Your LC Recovery →
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;margin:0">
        You received this because you requested our Letters of Credit recovery guide. No spam — this is the only email from this address.<br>
        Contact us: <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6">${SUPPORT_EMAIL}</a>
      </p>
    </div>

    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: email,
    subject: owed > 0 ? `Your bank may owe you ${naira(owed)} in LC interest` : "The interest your bank owes you on Letters of Credit",
    html,
  });
}

// ─── Recovery: Client Confirmation Email ──────────────────────────────────

interface ComplaintDetails {
  referenceId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  banks: string[];
  turnoverBand: string;
}

export async function sendComplaintConfirmation(details: ComplaintDetails) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Forensic Audit Complaint — Received")}

    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Dear ${details.contactName},</p>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
        Your forensic audit complaint has been <strong>securely received</strong>. A senior forensics specialist will contact you within <strong>24 business hours</strong> to confirm your engagement and schedule the initial review call.
      </p>

      <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px">Your Reference ID</p>
        <p style="margin:0;font-size:24px;font-weight:900;color:#1e40af;font-family:monospace">${details.referenceId}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#475569">Keep this safe — use it to track your case at majormaestro.com/recovery/track</p>
      </div>

      <h3 style="margin:0 0 12px;font-size:15px;color:#0f172a">Complaint Summary</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${[
          ["Company", details.companyName],
          ["Banks to Audit", details.banks.join(", ")],
          ["Annual Turnover", details.turnoverBand],
          ["Reference ID", details.referenceId],
          ["Status", "Received — Pending Assignment"],
        ].map(([k, v]) => `
          <tr>
            <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;color:#475569;width:40%">${k}</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b">${v}</td>
          </tr>`).join("")}
      </table>

      <h3 style="margin:24px 0 12px;font-size:15px;color:#0f172a">What Happens Next</h3>
      ${[
        ["1 — Assignment", "Your case is assigned to a senior forensic accountant within 2 business hours."],
        ["2 — Engagement Call", "We contact you within 24 business hours to discuss the engagement, sign NDAs, and schedule document collection."],
        ["3 — Document Collection", "Our team sets up a secure encrypted data room for your bank statements and facility letters."],
      ].map(([step, desc]) => `
        <div style="display:flex;gap:12px;margin-bottom:12px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <span style="font-weight:900;color:#1d4ed8;white-space:nowrap;font-size:13px">${step}</span>
          <span style="font-size:13px;color:#475569;line-height:1.5">${desc}</span>
        </div>`).join("")}

      <p style="margin:20px 0 0;font-size:13px;color:#475569">
        Questions? Reply to this email or contact us at
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#1d4ed8">${SUPPORT_EMAIL}</a>.
        All communications are protected by NDA from the moment you lodge your complaint.
      </p>
    </div>

    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: details.contactEmail,
    subject: `Complaint Received — Reference ${details.referenceId} | MajorGBN Forensic Recovery`,
    html,
  });
}

// ─── Recovery: Status Update Email ────────────────────────────────────────

interface StatusUpdateInput {
  referenceId: string;
  contactName: string;
  contactEmail: string;
  companyName: string;
  stepLabel: string;
  stepDescription: string;
  note?: string;
  showReferCta?: boolean;
}

export async function sendStatusUpdate(input: StatusUpdateInput) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping status update email");
    return;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Case Status Update")}

    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Dear ${input.contactName},</p>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
        We have an update on your forensic recovery case for <strong>${input.companyName}</strong>.
      </p>

      <div style="background:#ecfdf5;border:2px solid #6ee7b7;border-radius:10px;padding:20px;margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:1px">New Status</p>
        <p style="margin:0;font-size:18px;font-weight:900;color:#065f46">${input.stepLabel}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#047857;line-height:1.5">${input.stepDescription}</p>
      </div>

      ${input.note ? `
      <div style="background:#f8fafc;border-left:4px solid #1d4ed8;padding:14px 18px;margin-bottom:20px;border-radius:0 8px 8px 0">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px">Note from your team</p>
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.5">${input.note}</p>
      </div>` : ""}

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;text-align:center;margin-bottom:20px">
        <p style="margin:0;font-size:12px;color:#1e40af">Case Reference</p>
        <p style="margin:4px 0 8px;font-size:18px;font-weight:900;color:#1e3a8a;font-family:monospace">${input.referenceId}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com"}/recovery/track"
           style="display:inline-block;background:#1e3a8a;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:9px 20px;border-radius:6px">
          View Full Timeline →
        </a>
      </div>

      ${input.showReferCta ? `
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
        <p style="margin:0 0 8px;font-size:13px;color:#065f46">Know another company that may be owed money? <strong>Refer &amp; earn</strong> — a fixed bonus plus a share of their recovery.</p>
        <a href="${APP_URL}/recovery/refer" style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:9px 20px;border-radius:6px">Refer a company →</a>
      </div>` : ""}

      <p style="margin:0;font-size:13px;color:#475569">
        Questions? Reply to this email or contact us at
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#1d4ed8">${SUPPORT_EMAIL}</a>.
      </p>
    </div>

    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: input.contactEmail,
    subject: `[${input.referenceId}] Status Update: ${input.stepLabel}`,
    html,
  });
}

// ─── Recovery: Internal Team Notification ─────────────────────────────────

export async function sendInternalComplaintNotification(details: ComplaintDetails & {
  rcNumber: string;
  contactTitle: string;
  contactPhone: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping internal notification");
    return;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("NEW RECOVERY COMPLAINT — INTERNAL")}

    <div style="padding:32px">
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase">Reference ID</p>
        <p style="margin:0;font-size:22px;font-weight:900;color:#991b1b;font-family:monospace">${details.referenceId}</p>
      </div>

      <h3 style="margin:0 0 12px;font-size:15px;color:#0f172a">Organisation Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        ${[
          ["Company Name", details.companyName],
          ["RC Number", details.rcNumber],
          ["Annual Turnover", details.turnoverBand],
          ["Banks to Audit", details.banks.join(", ")],
        ].map(([k, v]) => `
          <tr>
            <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;color:#475569;width:40%">${k}</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b">${v}</td>
          </tr>`).join("")}
      </table>

      <h3 style="margin:0 0 12px;font-size:15px;color:#0f172a">Contact Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${[
          ["Name", details.contactName],
          ["Title", details.contactTitle],
          ["Email", `<a href="mailto:${details.contactEmail}" style="color:#1d4ed8">${details.contactEmail}</a>`],
          ["Phone", `<a href="tel:${details.contactPhone}" style="color:#1d4ed8">${details.contactPhone}</a>`],
        ].map(([k, v]) => `
          <tr>
            <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;color:#475569;width:40%">${k}</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b">${v}</td>
          </tr>`).join("")}
      </table>

      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Received: ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" })} WAT</p>
    </div>

    ${brandFooter()}
  </div>`;

  await sendOrThrow({
    from: FROM,
    to: INTERNAL_TEAM,
    subject: `[NEW COMPLAINT] ${details.companyName} — ${details.referenceId}`,
    html,
  });
}

// ─── Referral programme emails ─────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";

interface ReferralEmailInput {
  referrerEmail: string;
  referrerName: string;
  companyName: string;
  code: string;
}

export async function sendReferralLeadNotification(input: ReferralEmailInput) {
  if (!resend) return;
  const dash = `${APP_URL}/recovery/refer/${input.code}`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Referral Programme")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Hi ${input.referrerName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        Good news — <strong>${input.companyName}</strong> just lodged a forensic recovery case using your referral link. You're now in line to earn on this introduction.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${dash}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:12px 28px;border-radius:10px">View your referral dashboard</a>
      </div>
      <p style="margin:0;font-size:12px;color:#94a3b8">You earn a fixed bonus once their forensic audit completes, plus a share of the first recovery. Track progress any time at the link above.</p>
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.referrerEmail, subject: `Your referral ${input.companyName} just lodged a case`, html });
}

export async function sendReferralConversion(input: ReferralEmailInput) {
  if (!resend) return;
  const dash = `${APP_URL}/recovery/refer/${input.code}`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Referral Programme")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Hi ${input.referrerName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        🎉 <strong>${input.companyName}</strong> — a company you referred — has completed a successful recovery. Your referral reward is now due. Our team will be in touch to arrange payment.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${dash}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:12px 28px;border-radius:10px">View your earnings</a>
      </div>
      <p style="margin:0;font-size:12px;color:#94a3b8">Make sure your payout details are set on your dashboard so we can pay you promptly.</p>
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.referrerEmail, subject: `You've earned a referral reward — ${input.companyName} recovered`, html });
}

export async function sendReferralVerification(referrerEmail: string, referrerName: string, verifyUrl: string, shareUrl: string) {
  if (!resend) return { skipped: true } as const;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Confirm your referral account")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Hi ${referrerName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        Thanks for joining the MajorGBN referral programme. Confirm your email so we can verify rewards and pay you when your referrals recover.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${verifyUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:12px 28px;border-radius:10px">Confirm my email</a>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8">Your share link is ready to use now:</p>
      <p style="margin:0;font-size:12px;color:#475569;word-break:break-all;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0">${shareUrl}</p>
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: referrerEmail, subject: "Confirm your MajorGBN referral account", html });
  return { skipped: false } as const;
}

// ─── GICN (Global Impact Christian Network) emails ──────────────────────────

function gicnNaira(kobo: bigint): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(kobo) / 100);
}

function gicnReceiptBox(input: { amountKobo: bigint; programTitle?: string | null; reference?: string; paidAt?: Date | null }) {
  const dateStr = (input.paidAt ?? new Date()).toLocaleDateString("en-NG", { dateStyle: "long" });
  const rows: [string, string][] = [
    ["Receipt no.", input.reference ?? "—"],
    ["Date", dateStr],
    ["Amount", gicnNaira(input.amountKobo)],
    ["Designation", input.programTitle ?? "General fund"],
    ["Method", "Card / bank transfer via Paystack"],
  ];
  return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;margin-bottom:16px">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a">Payment receipt</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155">
          ${rows.map(([k, v]) => `<tr><td style="padding:4px 0;color:#64748b">${k}</td><td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a">${v}</td></tr>`).join("")}
        </table>
      </div>`;
}

export async function sendSponsorshipConfirmation(input: {
  sponsorEmail: string;
  sponsorName: string;
  amountKobo: bigint;
  programTitle?: string | null;
  paid?: boolean;
  reference?: string;
  paidAt?: Date | null;
}) {
  if (!resend) return;
  const intro = input.paid
    ? `Thank you for your generous gift of <strong>${gicnNaira(input.amountKobo)}</strong>${input.programTitle ? ` toward <strong>${input.programTitle}</strong>` : ""}. We've received your payment — your support helps young people access scholarships, leadership and faith programmes. Your receipt is below.`
    : `Thank you for your generous pledge of <strong>${gicnNaira(input.amountKobo)}</strong>${input.programTitle ? ` toward <strong>${input.programTitle}</strong>` : ""}. Your support helps young people access scholarships, leadership and faith programmes.`;
  const body = input.paid
    ? `${gicnReceiptBox(input)}<p style="margin:0;font-size:12px;color:#94a3b8">Keep this email as your receipt. You'll be able to see exactly which programme and beneficiaries your gift supports in the sponsorship ledger.</p>`
    : `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:14px;margin-bottom:16px"><p style="margin:0;font-size:13px;color:#065f46">Your sponsorship is recorded as <strong>pending</strong>. Our team will contact you with payment details to complete it.</p></div><p style="margin:0;font-size:12px;color:#94a3b8">You'll be able to see exactly which programme and beneficiaries your gift supports in the sponsorship ledger.</p>`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Dear ${input.sponsorName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">${intro}</p>
      ${body}
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({
    from: FROM,
    to: input.sponsorEmail,
    subject: input.paid ? "Your GICN sponsorship receipt" : "Thank you for sponsoring with GICN",
    html,
  });
}

export async function sendSponsorshipRefund(input: {
  sponsorEmail: string;
  sponsorName: string;
  amountKobo: bigint;
  programTitle?: string | null;
  reference?: string;
}) {
  if (!resend) return;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Dear ${input.sponsorName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        We've processed a refund of <strong>${gicnNaira(input.amountKobo)}</strong>${input.programTitle ? ` for your sponsorship toward <strong>${input.programTitle}</strong>` : ""}. The funds will be returned to your original payment method — please allow a few business days for your bank to reflect it.
      </p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin-bottom:16px">
        <p style="margin:0;font-size:13px;color:#1e3a8a">Refund reference: <strong>${input.reference ?? "—"}</strong></p>
      </div>
      <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't expect this or have any questions, just reply to this email and our team will help.</p>
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.sponsorEmail, subject: "Your GICN sponsorship has been refunded", html });
}

export async function sendGicnProgrammeReminder(input: {
  ownerEmail: string;
  childName: string;
  programTitle: string;
  startsAt: Date;
  location?: string | null;
  checkInCode: string;
}) {
  if (!resend) return;
  const when = input.startsAt.toLocaleDateString("en-NG", { dateStyle: "full" });
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">
      <p style="margin:0 0 12px;font-size:15px;color:#1e293b">Dear parent/guardian,</p>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        This is a friendly reminder that <strong>${input.childName}</strong> is registered for <strong>${input.programTitle}</strong>, starting <strong>${when}</strong>${input.location ? ` at <strong>${input.location}</strong>` : ""}.
      </p>
      ${gicnCodeBox(input.checkInCode, "Present this code at check-in on the day.")}
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">We look forward to welcoming ${input.childName}. If anything has changed, please reply to this email and our team will help.</p>
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.ownerEmail, subject: `Reminder: ${input.programTitle} is coming up`, html });
}

function scholarshipEmail(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  const button = cta
    ? `<div style="margin:24px 0"><a href="${cta.href}" style="display:inline-block;background:#10b981;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px">${cta.label}</a></div>`
    : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">${bodyHtml}${button}
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Questions? Just reply to this email.</p>
    </div>
    ${brandFooter()}
  </div>`;
}

const SCHOLARSHIPS_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com"}/gicn/scholarships`;

export async function sendScholarshipApplicationReceived(toEmail: string, input: { childName: string; programTitle: string }) {
  if (!resend) return;
  const html = scholarshipEmail(
    "Scholarship application received",
    `<p style="margin:0 0 12px;font-size:15px;color:#1e293b">Dear parent/guardian,</p>
     <p style="margin:0;font-size:15px;color:#475569;line-height:1.6">We've received your scholarship application for <strong>${input.childName}</strong> toward <strong>${input.programTitle}</strong>. Our review board will assess it and we'll be in touch with the decision.</p>`,
    { label: "View application", href: SCHOLARSHIPS_URL }
  );
  await sendOrThrow({ from: FROM, to: toEmail, subject: "Your GICN scholarship application — received", html });
}

export async function sendScholarshipAwarded(toEmail: string, input: { childName: string; programTitle: string; amountNgn: number; reference: string | null }) {
  if (!resend) return;
  const naira = "₦" + Math.round(input.amountNgn).toLocaleString("en-NG");
  const html = scholarshipEmail(
    "Scholarship awarded",
    `<p style="margin:0 0 12px;font-size:15px;color:#1e293b">Congratulations!</p>
     <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6"><strong>${input.childName}</strong> has been <strong>awarded a scholarship</strong> of <strong>${naira}</strong> toward <strong>${input.programTitle}</strong>${input.reference ? ` (ref ${input.reference})` : ""}.</p>
     <p style="margin:0;font-size:15px;color:#475569;line-height:1.6">Please complete onboarding — provide the required details and documents and accept the conditions — so we can activate the scholarship.</p>`,
    { label: "Complete onboarding", href: SCHOLARSHIPS_URL }
  );
  await sendOrThrow({ from: FROM, to: toEmail, subject: `${input.childName} has been awarded a GICN scholarship`, html });
}

export async function sendScholarshipActivated(toEmail: string, input: { childName: string; programTitle: string }) {
  if (!resend) return;
  const html = scholarshipEmail(
    "Scholarship active",
    `<p style="margin:0;font-size:15px;color:#475569;line-height:1.6"><strong>${input.childName}</strong>'s scholarship toward <strong>${input.programTitle}</strong> is now <strong>active</strong>. You can follow progress, conditions and disbursements from your scholarship profile.</p>`,
    { label: "View scholarship", href: SCHOLARSHIPS_URL }
  );
  await sendOrThrow({ from: FROM, to: toEmail, subject: `${input.childName}'s scholarship is now active`, html });
}

export async function sendScholarshipSuspended(toEmail: string, input: { childName: string; programTitle: string; reason?: string }) {
  if (!resend) return;
  const html = scholarshipEmail(
    "Scholarship suspended",
    `<p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6"><strong>${input.childName}</strong>'s scholarship toward <strong>${input.programTitle}</strong> has been <strong>suspended</strong>${input.reason ? `: ${input.reason}` : ""}.</p>
     <p style="margin:0;font-size:15px;color:#475569;line-height:1.6">Please get in touch so we can resolve it and reinstate the award.</p>`,
    { label: "View scholarship", href: SCHOLARSHIPS_URL }
  );
  await sendOrThrow({ from: FROM, to: toEmail, subject: `Action needed: ${input.childName}'s scholarship is suspended`, html });
}

export async function sendScholarshipRenewalReminder(toEmail: string, input: { childName: string; programTitle: string; dueAt: Date }) {
  if (!resend) return;
  const when = input.dueAt.toLocaleDateString("en-NG", { dateStyle: "full" });
  const html = scholarshipEmail(
    "Scholarship renewal due",
    `<p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6"><strong>${input.childName}</strong>'s scholarship toward <strong>${input.programTitle}</strong> is due for renewal on <strong>${when}</strong>.</p>
     <p style="margin:0;font-size:15px;color:#475569;line-height:1.6">Please upload the latest results and any required documents so the review board can renew the award without interruption.</p>`,
    { label: "Update scholarship", href: SCHOLARSHIPS_URL }
  );
  await sendOrThrow({ from: FROM, to: toEmail, subject: `Renewal due: ${input.childName}'s GICN scholarship`, html });
}

// Internal board nudge — to the team, not the guardian.
export async function sendScholarshipAtRiskNudge(input: { childName: string; programTitle: string; standing: string; term: string; reference: string | null }) {
  if (!resend) return;
  const html = scholarshipEmail(
    "Scholar flagged",
    `<p style="margin:0;font-size:15px;color:#475569;line-height:1.6">Scholar <strong>${input.childName}</strong> (${input.programTitle}${input.reference ? `, ${input.reference}` : ""}) is flagged <strong>${input.standing.replace("_", " ")}</strong> for <strong>${input.term}</strong>. Review the academic record and consider conditions, a check-in, or suspension.</p>`,
    { label: "Open review board", href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com"}/admin/gicn/scholarships` }
  );
  await sendOrThrow({ from: FROM, to: INTERNAL_TEAM, subject: `At-risk scholar: ${input.childName} (${input.standing})`, html });
}

function gicnCodeBox(checkInCode: string, caption = "Present this code at the event for check-in.") {
  return `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;text-align:center;margin-bottom:16px">
        <p style="margin:0;font-size:12px;color:#1e40af">Check-in code</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#1e3a8a;font-family:monospace">${checkInCode}</p>
        <p style="margin:6px 0 0;font-size:11px;color:#64748b">${caption}</p>
      </div>`;
}

export async function sendGicnRegistrationConfirmation(input: {
  ownerEmail: string;
  participantName: string;
  programTitle: string;
  checkInCode: string;
  waitlisted: boolean;
  pendingApproval?: boolean;
}) {
  if (!resend) return;
  let bodyLine: string;
  let detail: string;
  if (input.pendingApproval) {
    bodyLine = `<strong>${input.participantName}</strong>'s registration for <strong>${input.programTitle}</strong> has been <strong>submitted for review</strong>.`;
    detail = `<p style="margin:0 0 16px;font-size:13px;color:#475569">Our team will review the registration and you'll be notified once a decision is made. ${gicnCodeBox(input.checkInCode, "Your check-in code — it becomes valid once the registration is approved.")}</p>`;
  } else if (input.waitlisted) {
    bodyLine = `<strong>${input.participantName}</strong> has been added to the <strong>waitlist</strong> for <strong>${input.programTitle}</strong>.`;
    detail = `<p style="margin:0 0 16px;font-size:13px;color:#92400e">The programme is currently full. We'll confirm automatically and notify you if a place opens up.</p>`;
  } else {
    bodyLine = `<strong>${input.participantName}</strong> has been registered for <strong>${input.programTitle}</strong>.`;
    detail = gicnCodeBox(input.checkInCode);
  }
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">${bodyLine}</p>
      ${detail}
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.ownerEmail, subject: `GICN: ${input.participantName} — ${input.programTitle}`, html });
}

export async function sendGicnRegistrationApproved(input: {
  ownerEmail: string;
  participantName: string;
  programTitle: string;
  checkInCode: string;
}) {
  if (!resend) return;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        Good news — <strong>${input.participantName}</strong>'s registration for <strong>${input.programTitle}</strong> has been <strong style="color:#059669">approved</strong>.
      </p>
      ${gicnCodeBox(input.checkInCode)}
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.ownerEmail, subject: `GICN: ${input.participantName} approved — ${input.programTitle}`, html });
}

export async function sendGicnRegistrationRejected(input: {
  ownerEmail: string;
  participantName: string;
  programTitle: string;
  reason?: string;
}) {
  if (!resend) return;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    ${brandHeader("Global Impact Christian Network")}
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">
        We're sorry — <strong>${input.participantName}</strong>'s registration for <strong>${input.programTitle}</strong> could not be approved at this time.
      </p>
      ${input.reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-bottom:16px"><p style="margin:0;font-size:13px;color:#991b1b">${input.reason}</p></div>` : ""}
      <p style="margin:0;font-size:13px;color:#64748b">If you believe this is a mistake or have questions, please reply to this email.</p>
    </div>
    ${brandFooter()}
  </div>`;
  await sendOrThrow({ from: FROM, to: input.ownerEmail, subject: `GICN: registration update — ${input.programTitle}`, html });
}
