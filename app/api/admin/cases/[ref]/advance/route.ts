import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STEP_KEYS, STEP_DEFS, type StepKey } from "@/lib/recoverySteps";
import { recordAudit } from "@/lib/audit";
import { sendStatusUpdate } from "@/lib/email";

function isStepKey(s: string): s is StepKey {
  return (STEP_KEYS as readonly string[]).includes(s);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { ref } = await ctx.params;
  const referenceId = ref.toUpperCase();

  let payload: { step?: string; note?: string; notify?: boolean };
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const complaint = await db.recoveryComplaint.findUnique({
    where: { referenceId },
    include: { statusEvents: true },
  });
  if (!complaint) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  // Determine target step
  let targetStep: StepKey;
  if (payload.step) {
    if (!isStepKey(payload.step)) {
      return NextResponse.json({ error: "Invalid step key." }, { status: 400 });
    }
    targetStep = payload.step;
  } else {
    const reachedSet = new Set(complaint.statusEvents.map((e) => e.step));
    const nextIdx = STEP_KEYS.findIndex((k) => !reachedSet.has(k));
    if (nextIdx === -1) {
      return NextResponse.json({ error: "Case is already at the final step." }, { status: 400 });
    }
    targetStep = STEP_KEYS[nextIdx];
  }

  // Idempotency: skip if this step has already been recorded
  if (complaint.statusEvents.some((e) => e.step === targetStep)) {
    return NextResponse.json({ error: `Step "${targetStep}" was already reached for this case.` }, { status: 409 });
  }

  const note = payload.note?.trim() || null;

  await db.$transaction([
    db.caseStatusEvent.create({
      data: { complaintId: complaint.id, step: targetStep, note },
    }),
    db.recoveryComplaint.update({
      where: { id: complaint.id },
      data: { status: targetStep },
    }),
  ]);

  await recordAudit({
    action: "case_advance",
    targetType: "RecoveryComplaint",
    targetId: complaint.id,
    metadata: { referenceId, step: targetStep, note },
  });

  // Email client unless explicitly suppressed
  if (payload.notify !== false) {
    sendStatusUpdate({
      referenceId,
      contactName: complaint.contactName,
      contactEmail: complaint.contactEmail,
      companyName: complaint.companyName,
      stepLabel: STEP_DEFS[targetStep].label,
      stepDescription: STEP_DEFS[targetStep].description,
      note: note ?? undefined,
    }).catch((e) => console.error("[advance] Status email error:", e));
  }

  return NextResponse.json({ success: true, step: targetStep });
}
