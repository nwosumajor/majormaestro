import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { GICN_KINDS, isGuardianRelationship, GUARDIAN_RELATIONSHIP_LABELS, type GicnKind } from "@/lib/gicn";
import { isValidEmail, validatePhone } from "@/lib/validation";
import { GICN_AGREEMENTS } from "@/lib/policies/gicnAgreements";
import { computeGicnAcknowledgementHash } from "@/lib/gicnAgreementHash";

interface ProfilePayload {
  kind?: string;
  fullName?: string;
  phone?: string;
  relationshipToChild?: string;
  organizationName?: string;
  contactPersonName?: string;
  contactPersonRole?: string;
  contactEmail?: string;
  safeguardingLeadName?: string;
  safeguardingLeadContact?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  agreements?: {
    acceptedTerms?: boolean;
    acceptedPrivacy?: boolean;
    acceptedSafeguarding?: boolean;
    acceptedIndemnity?: boolean;
    acceptedByName?: string;
  };
}

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const profile = await db.gicnProfile.findUnique({
    where: { userId: user.id },
    select: {
      kind: true, organizationName: true, phone: true, fullName: true, relationshipToChild: true,
      contactPersonName: true, contactPersonRole: true, contactEmail: true,
      safeguardingLeadName: true, safeguardingLeadContact: true,
      addressLine: true, city: true, state: true, country: true,
    },
  });
  // Whether the current agreement bundle has already been accepted (so the form
  // can skip re-signing for a detail edit).
  const accepted = await db.gicnAgreementAcceptance.findFirst({
    where: { userId: user.id, bundleVersion: GICN_AGREEMENTS.version },
    select: { acceptedAt: true },
  });
  return NextResponse.json({
    profile,
    agreementsAccepted: !!accepted,
    agreementVersion: GICN_AGREEMENTS.version,
    acceptedAt: accepted?.acceptedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as ProfilePayload;
  if (!body.kind || !GICN_KINDS.includes(body.kind as GicnKind)) {
    return NextResponse.json({ error: "Choose guardian or school." }, { status: 400 });
  }
  const kind = body.kind as GicnKind;

  // ── Formal details (server is authoritative; the form mirrors for UX) ──
  const fieldErrors: Record<string, string> = {};
  const fullName = (body.fullName ?? "").trim();
  if (!fullName) fieldErrors.fullName = "Your full legal name is required.";

  const phoneCheck = validatePhone(body.phone);
  if (!phoneCheck.ok) fieldErrors.phone = "Enter a valid phone number (e.g. 0803 123 4567 or +234…).";
  const phone = phoneCheck.e164 ?? (body.phone ?? "").trim();

  if (!body.addressLine?.trim()) fieldErrors.addressLine = "Address is required.";
  if (!body.city?.trim()) fieldErrors.city = "City is required.";
  if (!body.state?.trim()) fieldErrors.state = "State is required.";
  const country = (body.country ?? "").trim() || "Nigeria";

  let organizationName: string | null = null;
  let contactPersonName: string | null = null;
  let contactPersonRole: string | null = null;
  let contactEmail: string | null = null;
  let safeguardingLeadName: string | null = null;
  let safeguardingLeadContact: string | null = null;
  let relationshipToChild: string | null = null;

  if (kind === "school") {
    organizationName = (body.organizationName ?? "").trim();
    contactPersonName = (body.contactPersonName ?? "").trim();
    contactPersonRole = (body.contactPersonRole ?? "").trim();
    safeguardingLeadName = (body.safeguardingLeadName ?? "").trim();
    safeguardingLeadContact = (body.safeguardingLeadContact ?? "").trim();
    if (!organizationName) fieldErrors.organizationName = "School / organisation name is required.";
    if (!contactPersonName) fieldErrors.contactPersonName = "Contact person name is required.";
    if (!contactPersonRole) fieldErrors.contactPersonRole = "Contact person role is required.";
    if (!isValidEmail(body.contactEmail)) fieldErrors.contactEmail = "A valid school email is required.";
    else contactEmail = body.contactEmail!.trim();
    if (!safeguardingLeadName) fieldErrors.safeguardingLeadName = "Designated safeguarding lead is required.";
    if (!safeguardingLeadContact) fieldErrors.safeguardingLeadContact = "Safeguarding lead contact is required.";
  } else {
    if (!isGuardianRelationship(body.relationshipToChild)) {
      fieldErrors.relationshipToChild = "Select your relationship to the child(ren).";
    } else {
      relationshipToChild = body.relationshipToChild;
    }
  }

  // ── Agreements: required unless the current bundle version is already accepted ──
  const existingAcceptance = await db.gicnAgreementAcceptance.findFirst({
    where: { userId: user.id, bundleVersion: GICN_AGREEMENTS.version },
    select: { id: true },
  });
  const needAgreements = !existingAcceptance;
  const a = body.agreements;
  const acceptedByName = (a?.acceptedByName ?? "").trim();
  if (needAgreements) {
    if (!a?.acceptedTerms || !a?.acceptedPrivacy || !a?.acceptedSafeguarding || !a?.acceptedIndemnity || !acceptedByName) {
      fieldErrors.agreements = "You must read and accept all four agreements and type your full name as signature.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please correct the highlighted fields.", fields: fieldErrors }, { status: 422 });
  }

  const acceptedByRole =
    kind === "school"
      ? contactPersonRole
      : relationshipToChild
        ? GUARDIAN_RELATIONSHIP_LABELS[relationshipToChild as keyof typeof GUARDIAN_RELATIONSHIP_LABELS]
        : null;
  const acceptedAt = new Date();
  const acknowledgementHash = needAgreements
    ? computeGicnAcknowledgementHash({
        bundleVersion: GICN_AGREEMENTS.version,
        userId: user.id,
        kind,
        acceptedByName,
        acceptedAt: acceptedAt.toISOString(),
      })
    : null;

  const profile = await db.$transaction(async (tx) => {
    const p = await tx.gicnProfile.upsert({
      where: { userId: user.id },
      update: {
        kind, organizationName, phone, fullName, relationshipToChild,
        contactPersonName, contactPersonRole, contactEmail,
        safeguardingLeadName, safeguardingLeadContact,
        addressLine: body.addressLine!.trim(), city: body.city!.trim(), state: body.state!.trim(), country,
      },
      create: {
        userId: user.id, kind, organizationName, phone, fullName, relationshipToChild,
        contactPersonName, contactPersonRole, contactEmail,
        safeguardingLeadName, safeguardingLeadContact,
        addressLine: body.addressLine!.trim(), city: body.city!.trim(), state: body.state!.trim(), country,
      },
      select: { id: true, kind: true },
    });
    if (needAgreements && acknowledgementHash) {
      await tx.gicnAgreementAcceptance.create({
        data: {
          gicnProfileId: p.id,
          userId: user.id,
          kind,
          bundleVersion: GICN_AGREEMENTS.version,
          acceptedTerms: true,
          acceptedPrivacy: true,
          acceptedSafeguarding: true,
          acceptedIndemnity: true,
          acceptedByName,
          acceptedByRole,
          ipAddress: getClientIp(req),
          userAgent: req.headers.get("user-agent")?.slice(0, 1024) ?? null,
          acknowledgementHash,
          acceptedAt,
        },
      });
    }
    return p;
  });

  await recordAudit({ action: "gicn_profile_upsert", actorLabel: user.email, targetType: "GicnProfile", targetId: profile.id, metadata: { kind } });
  if (needAgreements) {
    await recordAudit({
      action: "gicn_agreement_accepted",
      actorLabel: acceptedByName,
      targetType: "GicnProfile",
      targetId: profile.id,
      metadata: { kind, bundleVersion: GICN_AGREEMENTS.version, acknowledgementHash },
    });
  }

  return NextResponse.json({ profile: { kind: profile.kind } });
}
