import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { sendComplaintConfirmation, sendInternalComplaintNotification, sendReferralLeadNotification } from "@/lib/email";
import { dispatch as dispatchWebhook } from "@/lib/webhooks";
import { pickTeam } from "@/lib/recoverySteps";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { isValidEmail, validatePhone } from "@/lib/validation";
import { isRepresentativeIdType } from "@/lib/recoveryKyc";
import { recordAudit } from "@/lib/audit";
import { getClientUserFromRequest } from "@/lib/auth";
import { RECOVERY_TERMS } from "@/lib/policies/recoveryTerms";
import { computeAcknowledgementHash } from "@/lib/recoveryTermsHash";

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
  const rl = rateLimit(`recovery:${getClientIp(req)}`, 5, 60 * 60);
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
    // Store the phone in normalized E.164 form.
    const normalizedPhone = phone.e164 ?? body.contactPhone.trim();

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
    after(async () => {
      await Promise.all([
        sendComplaintConfirmation(details).catch((e) =>
          console.error("[recovery] Confirmation email error:", e)
        ),
        sendInternalComplaintNotification(details).catch((e) =>
          console.error("[recovery] Internal notification error:", e)
        ),
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
