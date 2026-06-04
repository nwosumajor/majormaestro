import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { sendGicnRegistrationConfirmation } from "@/lib/email";
import { generateCheckInCode } from "@/lib/gicn";

// Register a participant into an OPEN program. Capacity-aware: auto-waitlists
// when the confirmed count has reached capacity.
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { participantId?: string; programId?: string };
  if (!body.participantId || !body.programId) {
    return NextResponse.json({ error: "participantId and programId are required." }, { status: 400 });
  }
  const { participantId, programId } = body;

  const outcome = await db.$transaction(async (tx) => {
    const participant = await tx.participant.findUnique({ where: { id: participantId }, select: { id: true, ownerUserId: true, fullName: true } });
    if (!participant || participant.ownerUserId !== user.id) return { kind: "forbidden" as const };
    const program = await tx.program.findUnique({ where: { id: programId }, select: { id: true, status: true, capacity: true, title: true } });
    if (!program) return { kind: "noprogram" as const };
    if (program.status !== "OPEN") return { kind: "notopen" as const };
    const existing = await tx.programRegistration.findUnique({ where: { participantId_programId: { participantId, programId } }, select: { id: true } });
    if (existing) return { kind: "dup" as const };

    const confirmed = await tx.programRegistration.count({ where: { programId, status: "CONFIRMED" } });
    const status = program.capacity != null && confirmed >= program.capacity ? "WAITLISTED" : "CONFIRMED";

    let code = generateCheckInCode();
    for (let i = 0; i < 5; i++) {
      const clash = await tx.programRegistration.findUnique({ where: { checkInCode: code }, select: { id: true } });
      if (!clash) break;
      code = generateCheckInCode();
    }
    const reg = await tx.programRegistration.create({
      data: { participantId, programId, status, checkInCode: code },
      select: { id: true, status: true, checkInCode: true },
    });
    return { kind: "ok" as const, reg, participantName: participant.fullName, programTitle: program.title };
  });

  if (outcome.kind === "forbidden") return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  if (outcome.kind === "noprogram") return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  if (outcome.kind === "notopen") return NextResponse.json({ error: "This programme is not open for registration." }, { status: 400 });
  if (outcome.kind === "dup") return NextResponse.json({ error: "This participant is already registered for that programme." }, { status: 409 });

  await recordAudit({
    action: "gicn_program_register",
    actorLabel: user.email,
    targetType: "ProgramRegistration",
    targetId: outcome.reg.id,
    metadata: { participantId, programId, status: outcome.reg.status },
  });

  after(() =>
    sendGicnRegistrationConfirmation({
      ownerEmail: user.email,
      participantName: outcome.participantName,
      programTitle: outcome.programTitle,
      checkInCode: outcome.reg.checkInCode,
      waitlisted: outcome.reg.status === "WAITLISTED",
    }).catch((e) => console.error("[gicn-register] email error:", e))
  );

  return NextResponse.json({ status: outcome.reg.status, checkInCode: outcome.reg.checkInCode }, { status: 201 });
}
