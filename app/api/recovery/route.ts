import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendComplaintConfirmation, sendInternalComplaintNotification } from "@/lib/email";
import { pickTeam } from "@/lib/recoverySteps";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

interface DocumentInfo {
  documentType: string;
  fileName: string;
  storedAs: string;
  size: number;
  mimeType: string;
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

    const referenceId = generateReference();
    const assignedTeam = pickTeam(referenceId);

    // Validate referral code if supplied — silently drop if unknown
    let referralCode: string | undefined;
    if (db && body.referralCode) {
      try {
        const found = await db.referral.findUnique({ where: { code: body.referralCode } });
        if (found) referralCode = found.code;
      } catch (dbErr) {
        console.error("[recovery] Referral lookup error (non-fatal):", dbErr);
      }
    }

    // Persist to database
    if (db) {
      try {
        await db.recoveryComplaint.create({
          data: {
            referenceId,
            companyName: body.companyName,
            rcNumber: body.rcNumber,
            turnoverBand: body.turnoverBand,
            banks: body.banks,
            contactName: body.contactName,
            contactTitle: body.contactTitle,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            confirmedSignatory: body.confirmedSignatory,
            agreedNDPA: body.agreedNDPA,
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
                  })),
                }
              : undefined,
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
      contactPhone: body.contactPhone,
      banks: body.banks,
      turnoverBand: body.turnoverBand,
    };

    Promise.all([
      sendComplaintConfirmation(details).catch((e) =>
        console.error("[recovery] Confirmation email error:", e)
      ),
      sendInternalComplaintNotification(details).catch((e) =>
        console.error("[recovery] Internal notification error:", e)
      ),
    ]);

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
