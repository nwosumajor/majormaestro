import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { parseBulkRegistration } from "@/lib/gicnRegistrationSchema";
import { generateCheckInCode } from "@/lib/gicn";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

// School partner bulk registration: parse + validate (reject-with-reasons,
// don't fail the batch) → create Participant + ProgramRegistration under the
// school account, capacity-aware (auto-waitlist when full). Consent is
// school-attested per row (guardianConsent=yes), recorded with the school user.
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await db.gicnProfile.findUnique({ where: { userId: user.id }, select: { kind: true, organizationName: true } });
  if (!profile || profile.kind !== "school") {
    return NextResponse.json({ error: "A school partner account is required for bulk registration." }, { status: 403 });
  }

  const rl = rateLimit(`gicn-bulk:${user.id}`, 3, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: "Bulk upload limit reached (3/hour)." }, { status: 429, headers: rateLimitHeaders(rl) });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 5 MB." }, { status: 400 });
  if (!/\.(xlsx|csv)$/i.test(file.name)) return NextResponse.json({ error: "Upload an .xlsx or .csv file." }, { status: 400 });

  const programId = String(form.get("programId") ?? "");
  const program = programId
    ? await db.program.findUnique({ where: { id: programId }, select: { id: true, status: true, capacity: true, requiresApproval: true } })
    : null;
  if (!program || program.status !== "OPEN") {
    return NextResponse.json({ error: "Select an open programme to register the students into." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, rejected, missingColumns } = await parseBulkRegistration(buffer, file.name);
  if (missingColumns.length) {
    return NextResponse.json({ error: `Missing required column(s): ${missingColumns.join(", ")}. Use the template.` }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ error: "No valid rows found.", rejected }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS}).` }, { status: 400 });

  const result = await db.$transaction(async (tx) => {
    let approved = await tx.programRegistration.count({ where: { programId: program.id, status: "APPROVED" } });
    let accepted = 0;
    let waitlisted = 0;
    let submitted = 0;
    for (const r of rows) {
      const participant = await tx.participant.create({
        data: {
          ownerUserId: user.id,
          fullName: r.fullName,
          dateOfBirth: r.dateOfBirth,
          schoolName: profile.organizationName,
          classLevel: r.classLevel,
          address: r.address,
          guardianName: r.guardianName,
          consentGrantedAt: new Date(),
          consentGrantedByUserId: user.id, // school-attested consent
          mediaReleaseGranted: r.mediaReleaseGranted,
        },
        select: { id: true },
      });
      // Approval-gated programmes: every student lands as SUBMITTED for review.
      // Open programmes: capacity-aware APPROVED/WAITLISTED.
      const status = program.requiresApproval
        ? "SUBMITTED"
        : program.capacity != null && approved >= program.capacity
          ? "WAITLISTED"
          : "APPROVED";
      let code = generateCheckInCode();
      for (let i = 0; i < 5; i++) {
        const clash = await tx.programRegistration.findUnique({ where: { checkInCode: code }, select: { id: true } });
        if (!clash) break;
        code = generateCheckInCode();
      }
      await tx.programRegistration.create({ data: { participantId: participant.id, programId: program.id, status, checkInCode: code } });
      if (status === "APPROVED") { approved++; accepted++; }
      else if (status === "SUBMITTED") submitted++;
      else waitlisted++;
    }
    return { accepted, waitlisted, submitted };
  });

  await recordAudit({
    action: "gicn_bulk_register",
    actorLabel: user.email,
    targetType: "Program",
    targetId: program.id,
    metadata: { accepted: result.accepted, waitlisted: result.waitlisted, rejected: rejected.length, school: profile.organizationName },
  });

  return NextResponse.json({ accepted: result.accepted, waitlisted: result.waitlisted, submitted: result.submitted, rejected }, { status: 201, headers: rateLimitHeaders(rl) });
}
