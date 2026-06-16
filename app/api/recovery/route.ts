import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendComplaintConfirmation, sendInternalComplaintNotification, sendReferralLeadNotification } from "@/lib/email";
import { dispatch as dispatchWebhook } from "@/lib/webhooks";
import { pickTeam } from "@/lib/recoverySteps";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { isValidEmail, validatePhone } from "@/lib/validation";
import { isRepresentativeIdType } from "@/lib/recoveryKyc";
import {
  isAuthorizationMethod,
  sanitizeSignatories,
  checkLoaConformance,
  loaEnforcementMode,
  type LoaSignatory,
} from "@/lib/recoveryLoa";
import { recordAudit } from "@/lib/audit";
import { getClientUserFromRequest } from "@/lib/auth";
import { RECOVERY_TERMS } from "@/lib/policies/recoveryTerms";
import { computeAcknowledgementHash } from "@/lib/recoveryTermsHash";
import { normalizeOtpTarget, OTP_VERIFIED_WINDOW_MS } from "@/lib/otp";
import { smsConfigured } from "@/lib/sms";
import { sendSlack } from "@/lib/slack";

interface DocumentInfo {
  documentType: string;
  fileName: string;
  storedAs: string;
  size: number;
  mimeType: string;
  storageBackend?: "local" | "s3";
}

interface RecoveryPayload {
  companyName: string;
  rcNumber: string;
  turnoverBand: string;
  banks: string[];
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  confirmedSignatory: boolean;
  agreedNDPA: boolean;
  // Feature 4 — loan / facility status
  hasActiveOrPendingFacility?: boolean;
  hasPriorBankDispute?: boolean;
  engagementContext?: string;
  // Feature 5 — KYC: registered address + representative ID
  regAddressLine1?: string;
  regAddressLine2?: string;
  regAddressCity?: string;
  regAddressState?: string;
  regAddressCountry?: string;
  regAddressPostalCode?: string;
  representativeIdType?: string;
  // Feature 3 — Letter-of-Authorization signatory rules
  authorizationMethod?: string;
  companyHasSoleDirector?: boolean;
  loaSignatories?: { name?: string; title?: string }[];
  // Feature 1 — Terms & Data-Protection acceptance
  terms?: {
    accepted?: boolean;
    policyVersion?: string;
    acceptedByName?: string;
    acceptedByTitle?: string;
    signatureType?: "typed_signature" | "checkbox_attestation";
  };
  documents?: DocumentInfo[];
  referralCode?: string;
}

const REQUIRED_FIELDS: (keyof RecoveryPayload)[] = [
  "companyName",
  "rcNumber",
  "turnoverBand",
  "contactName",
  "contactTitle",
  "contactEmail",
  "contactPhone",
];

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GBN-${ts}-${rand}`;
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`recovery:${getClientIp(req)}`, 5, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions from this network. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = (await req.json()) as RecoveryPayload;

    for (const field of REQUIRED_FIELDS) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}.` },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(body.banks) || body.banks.length === 0) {
      return NextResponse.json(
        { error: "At least one bank must be listed for audit." },
        { status: 400 }
      );
    }

    if (!body.confirmedSignatory) {
      return NextResponse.json(
        { error: "Authorised signatory confirmation is required." },
        { status: 400 }
      );
    }

    if (!body.agreedNDPA) {
      return NextResponse.json(
        { error: "NDPA 2023 and NDA acknowledgment is required." },
        { status: 400 }
      );
    }

    // Contact-data validation (authoritative — the form mirrors this for UX).
    // Returns field-level errors so the client can highlight the offending input.
    const fieldErrors: Record<string, string> = {};
    if (!isValidEmail(body.contactEmail)) {
      fieldErrors.contactEmail = "Enter a valid email address.";
    }
    const phone = validatePhone(body.contactPhone);
    if (!phone.ok) {
      fieldErrors.contactPhone = "Enter a valid phone number (e.g. 0803 123 4567 or +234…).";
    }
    // Feature 4 — facility status is required (true/false).
    if (typeof body.hasActiveOrPendingFacility !== "boolean") {
      fieldErrors.hasActiveOrPendingFacility = "Please indicate whether a loan/facility is active or pending.";
    }
    // Feature 5 — registered address (line1/city/state/country) + representative ID type required.
    if (!body.regAddressLine1?.trim()) fieldErrors.regAddressLine1 = "Registered business address is required.";
    if (!body.regAddressCity?.trim()) fieldErrors.regAddressCity = "City is required.";
    if (!body.regAddressState?.trim()) fieldErrors.regAddressState = "State is required.";
    if (!body.regAddressCountry?.trim()) fieldErrors.regAddressCountry = "Country is required.";
    if (!isRepresentativeIdType(body.representativeIdType)) {
      fieldErrors.representativeIdType = "Select the authorized representative's ID type.";
    }
    // Feature 3 — authorization method + sole-director flag are always required
    // (data capture); the signatory/document *conformance* is enforced per the
    // LOA_SIGNATORY_ENFORCEMENT flag below.
    if (!isAuthorizationMethod(body.authorizationMethod)) {
      fieldErrors.authorizationMethod = "Select how this engagement is authorised.";
    }
    if (typeof body.companyHasSoleDirector !== "boolean") {
      fieldErrors.companyHasSoleDirector = "Indicate whether the company has a sole director.";
    }
    // Feature 1 — Terms acceptance is mandatory: explicit accept, current policy
    // version, and a non-empty typed signer name. Authoritative server-side gate.
    const terms = body.terms;
    if (
      !terms ||
      terms.accepted !== true ||
      terms.policyVersion !== RECOVERY_TERMS.version ||
      !terms.acceptedByName?.trim()
    ) {
      fieldErrors.terms = "You must read and accept the engagement terms, and type your full name as signature.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: "Please correct the highlighted fields.", fields: fieldErrors },
        { status: 422 }
      );
    }
    // Feature 3 — LoA conformance. Method + sole-director flag validated above.
    const authorizationMethod = body.authorizationMethod!; // narrowed by 422 above
    const companyHasSoleDirector = body.companyHasSoleDirector as boolean;
    const loaSignatories: LoaSignatory[] = sanitizeSignatories(body.loaSignatories);
    const documentTypes = (body.documents ?? []).map((d) => d.documentType);
    const conformance = checkLoaConformance({
      method: authorizationMethod as Parameters<typeof checkLoaConformance>[0]["method"],
      signatories: loaSignatories,
      companyHasSoleDirector,
      documentTypes,
    });
    const enforcement = loaEnforcementMode();
    if (enforcement === "strict" && !conformance.ok) {
      return NextResponse.json(
        { error: "Authorisation requirements are not met.", fields: { authorization: conformance.reasons.join(" ") } },
        { status: 422 }
      );
    }

    // Store the phone in normalized E.164 form.
    const normalizedPhone = phone.e164 ?? body.contactPhone.trim();

    // Feature 2b — contact verification (OTP). Set verified timestamps from any
    // recently-consumed challenge for this email/phone; enforce when required.
    let contactEmailVerifiedAt: Date | null = null;
    let contactPhoneVerifiedAt: Date | null = null;
    if (db) {
      try {
        const since = new Date(Date.now() - OTP_VERIFIED_WINDOW_MS);
        const emailTarget = normalizeOtpTarget("email", body.contactEmail);
        const phoneTarget = normalizeOtpTarget("sms", normalizedPhone);
        const [ev, pv] = await Promise.all([
          db.otpChallenge.findFirst({
            where: { channel: "email", target: emailTarget, consumedAt: { gte: since } },
            orderBy: { consumedAt: "desc" },
            select: { consumedAt: true },
          }),
          db.otpChallenge.findFirst({
            where: { channel: "sms", target: phoneTarget, consumedAt: { gte: since } },
            orderBy: { consumedAt: "desc" },
            select: { consumedAt: true },
          }),
        ]);
        contactEmailVerifiedAt = ev?.consumedAt ?? null;
        contactPhoneVerifiedAt = pv?.consumedAt ?? null;
      } catch (otpErr) {
        // Never let a verification-lookup failure break intake; treat as unverified.
        console.error("[recovery] OTP lookup error (non-fatal):", otpErr);
      }
    }
    if (process.env.RECOVERY_OTP_REQUIRED === "true") {
      if (!contactEmailVerifiedAt) {
        return NextResponse.json(
          { error: "Please verify your email address with the code we sent.", fields: { otp: "Email verification is required." } },
          { status: 422 }
        );
      }
      // Phone verification is only enforced when an SMS provider is configured.
      if (smsConfigured() && !contactPhoneVerifiedAt) {
        return NextResponse.json(
          { error: "Please verify your phone number with the code we sent.", fields: { otp: "Phone verification is required." } },
          { status: 422 }
        );
      }
    }

    const referenceId = generateReference();
    const assignedTeam = pickTeam(referenceId);

    // Resolve referral: explicit body code, else the first-touch gbn_ref cookie.
    // Silently drop unknown codes and self-referrals (can't refer your own company).
    let referralCode: string | undefined;
    let referralRow: { code: string; referrerName: string; referrerEmail: string } | null = null;
    const refCandidate = body.referralCode || req.cookies.get("gbn_ref")?.value;
    if (db && refCandidate) {
      try {
        const found = await db.referral.findUnique({
          where: { code: refCandidate },
          select: { code: true, referrerName: true, referrerEmail: true },
        });
        if (found && found.referrerEmail.toLowerCase() !== body.contactEmail.trim().toLowerCase()) {
          referralCode = found.code;
          referralRow = found;
        }
      } catch (dbErr) {
        console.error("[recovery] Referral lookup error (non-fatal):", dbErr);
      }
    }

    // Terms acceptance metadata (validated above). The complaint + its acceptance
    // are written in one transaction so a complaint can never exist without it.
    const clientUser = await getClientUserFromRequest(req).catch(() => null);
    const acceptedAt = new Date();
    const acceptedByName = body.terms?.acceptedByName?.trim() ?? "";
    const acceptedByTitle = body.terms?.acceptedByTitle?.trim() || null;
    const signatureType =
      body.terms?.signatureType === "checkbox_attestation" ? "checkbox_attestation" : "typed_signature";
    const acknowledgementHash = computeAcknowledgementHash({
      policyVersion: RECOVERY_TERMS.version,
      referenceId,
      companyName: body.companyName,
      rcNumber: body.rcNumber,
      acceptedByName,
      acceptedAt: acceptedAt.toISOString(),
    });

    // Persist to database
    if (db) {
      try {
        await db.$transaction(async (tx) => {
          const created = await tx.recoveryComplaint.create({
            data: {
              referenceId,
              companyName: body.companyName,
              rcNumber: body.rcNumber,
              turnoverBand: body.turnoverBand,
              banks: body.banks,
              contactName: body.contactName,
              contactTitle: body.contactTitle,
              contactEmail: body.contactEmail,
              contactPhone: normalizedPhone,
              contactEmailVerifiedAt,
              contactPhoneVerifiedAt,
              confirmedSignatory: body.confirmedSignatory,
              agreedNDPA: body.agreedNDPA,
              // Feature 4 — loan / facility status
              hasActiveOrPendingFacility: body.hasActiveOrPendingFacility,
              hasPriorBankDispute: typeof body.hasPriorBankDispute === "boolean" ? body.hasPriorBankDispute : null,
              engagementContext: body.engagementContext?.trim() || null,
              // Feature 5 — KYC: registered address + representative ID type
              regAddressLine1: body.regAddressLine1?.trim() || null,
              regAddressLine2: body.regAddressLine2?.trim() || null,
              regAddressCity: body.regAddressCity?.trim() || null,
              regAddressState: body.regAddressState?.trim() || null,
              regAddressCountry: body.regAddressCountry?.trim() || null,
              regAddressPostalCode: body.regAddressPostalCode?.trim() || null,
              representativeIdType: body.representativeIdType,
              // Feature 3 — Letter-of-Authorization
              authorizationMethod,
              companyHasSoleDirector,
              loaSignatories: loaSignatories as unknown as Prisma.InputJsonValue,
              assignedTeam,
              referralCode,
              statusEvents: { create: [{ step: "received" }] },
              documents: body.documents?.length
                ? {
                    create: body.documents.map((d) => ({
                      documentType: d.documentType,
                      fileName: d.fileName,
                      storedAs: d.storedAs,
                      fileSize: d.size,
                      mimeType: d.mimeType,
                      storageBackend: d.storageBackend ?? "local",
                    })),
                  }
                : undefined,
              // Feature 1 — Terms & Data-Protection acceptance (atomic with the complaint)
              termsAcceptance: {
                create: {
                  userId: clientUser?.id ?? null,
                  policyVersion: RECOVERY_TERMS.version,
                  acceptedByName,
                  acceptedByTitle,
                  signatureType,
                  ipAddress: getClientIp(req),
                  userAgent: req.headers.get("user-agent")?.slice(0, 1024) ?? null,
                  acknowledgementHash,
                  acceptedAt,
                },
              },
            },
          });
          return created;
        });

        await recordAudit({
          action: "recovery_terms_accepted",
          actorLabel: acceptedByName,
          targetType: "RecoveryComplaint",
          targetId: referenceId,
          metadata: { referenceId, policyVersion: RECOVERY_TERMS.version, signatureType, acknowledgementHash },
        });

        await recordAudit({
          action: "recovery_authorization_captured",
          actorLabel: acceptedByName,
          targetType: "RecoveryComplaint",
          targetId: referenceId,
          metadata: {
            referenceId,
            authorizationMethod,
            companyHasSoleDirector,
            signatoryCount: loaSignatories.length,
            enforcement,
            conforming: conformance.ok,
            advisoryWarnings: conformance.ok ? [] : conformance.reasons,
          },
        });
      } catch (dbErr) {
        console.error("[recovery] DB error (non-fatal):", dbErr);
        // Still proceed — log to console as fallback
        console.log("[recovery] Complaint payload:", { referenceId, ...body });
      }
    } else {
      console.log("[recovery] No DB configured — complaint logged:", {
        referenceId,
        receivedAt: new Date().toISOString(),
        ...body,
      });
    }

    // Send emails concurrently (non-blocking)
    const details = {
      referenceId,
      companyName: body.companyName,
      rcNumber: body.rcNumber,
      contactName: body.contactName,
      contactTitle: body.contactTitle,
      contactEmail: body.contactEmail,
      contactPhone: normalizedPhone,
      banks: body.banks,
      turnoverBand: body.turnoverBand,
    };

    // Run the sends AFTER the response is flushed (so the client isn't blocked on
    // email latency), but inside after() so Vercel keeps the function alive until
    // they complete — a bare fire-and-forget Promise can be torn down on response
    // flush, silently dropping the internal notification. sendOrThrow (in lib/email)
    // throws on a rejected send, so a failed delivery is logged here, not swallowed.
    // SLA: forensic specialist to respond within 24h of intake.
    const slaDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    after(async () => {
      await Promise.all([
        sendComplaintConfirmation(details).catch((e) =>
          console.error("[recovery] Confirmation email error:", e)
        ),
        sendInternalComplaintNotification({ ...details, slaDueAt }).catch((e) =>
          console.error("[recovery] Internal notification error:", e)
        ),
        // Fast-response team alert (no-op if SLACK_WEBHOOK_URL unset).
        sendSlack(
          `🆕 *New recovery complaint* — ${body.companyName}\n` +
            `Ref: ${referenceId} · Turnover: ${body.turnoverBand} · Banks: ${body.banks.join(", ")}\n` +
            `Contact: ${body.contactName} (${body.contactTitle}) · ${body.contactEmail} · ${normalizedPhone}\n` +
            `⏰ Respond by ${slaDueAt.toUTCString()}` +
            (referralRow ? `\nReferred by ${referralRow.referrerName} (${referralRow.code})` : ""),
        ).catch((e) => console.error("[recovery] Slack alert error:", e)),
        // Referral: notify the introducer + fire the referral.created webhook.
        referralRow
          ? sendReferralLeadNotification({
              referrerEmail: referralRow.referrerEmail,
              referrerName: referralRow.referrerName,
              companyName: body.companyName,
              code: referralRow.code,
            }).catch((e) => console.error("[recovery] Referral email error:", e))
          : Promise.resolve(),
        referralRow
          ? dispatchWebhook({
              event: "referral.created",
              data: { referenceId, companyName: body.companyName, referralCode: referralRow.code, referrerEmail: referralRow.referrerEmail },
              filterContext: { hasReferral: true },
            }).catch((e) => console.error("[recovery] referral.created webhook error:", e))
          : Promise.resolve(),
      ]);
    });

    return NextResponse.json({
      success: true,
      referenceId,
      message:
        "Your complaint has been securely received. A forensic specialist will contact you within 24 business hours to discuss next steps.",
    });
  } catch (err) {
    console.error("[/api/recovery]", err);
    return NextResponse.json(
      { error: "Submission failed. Please try again or contact us directly." },
      { status: 500 }
    );
  }
}
