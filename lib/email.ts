import { Resend } from "resend";

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
        ["1. Your COT rate exceeds ₦1 per mille (0.1%)", "The CBN cap is ₦1 per mille per debit transaction. Many banks charge 2–5× this limit without challenge."],
        ["2. Your overdraft interest is above MPR + 7%", "With the current CBN MPR at 27.5%, the maximum permissible rate is approximately 34.5% p.a. Rates above this are illegal."],
        ["3. LC confirmation fees exceed 1.5% per quarter", "Banks sometimes charge 2–3% per quarter on Letters of Credit — double the CBN approved ceiling."],
        ["4. SWIFT transfer fees exceed $25 USD per transaction", "The flat cap is $25 USD. Any excess per transaction is recoverable, and these add up quickly across years of imports."],
        ["5. Annual facility review fees exceed ₦10,000", "The CBN caps this at ₦10,000 per facility per annum. Charges of ₦50,000–₦200,000 are commonplace."],
        ["6. Credit risk premiums exceed 2% per annum", "Added to base rates on facilities, this is capped at 2% p.a. Excess beyond that is an overcharge."],
        ["7. Account maintenance charges exceed ₦1/mille per quarter", "For current accounts, the CBN limit is ₦1 per mille per quarter. Many banks apply 3–5× this rate."],
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
