import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { STEP_KEYS, STEP_DEFS, type StepKey } from "@/lib/recoverySteps";
import { recordAudit } from "@/lib/audit";
import { sendStatusUpdate } from "@/lib/email";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { dispatch as dispatchWebhook } from "@/lib/webhooks";

function isStepKey(s: string): s is StepKey {
  return (STEP_KEYS as readonly string[]).includes(s);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  const gate = await requireAdmin(req, "cases.write");
  if (gate.error) return gate.error;
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
  const isClosing = targetStep === "recovered";

  await db.$transaction([
    db.caseStatusEvent.create({
      data: { complaintId: complaint.id, step: targetStep, note },
    }),
    db.recoveryComplaint.update({
      where: { id: complaint.id },
      data: {
        status: targetStep,
        ...(isClosing && !complaint.closedAt ? { closedAt: new Date() } : {}),
      },
    }),
  ]);

  const admin = await getAdminFromRequest(req);
  await recordAudit({
    action: "case_advance",
    actorLabel: admin?.email ?? "admin",
    targetType: "RecoveryComplaint",
    targetId: complaint.id,
    metadata: { referenceId, step: targetStep, note, actorId: admin?.id },
  });

  // Email client unless explicitly suppressed. Sent inside after() so Vercel keeps
  // the function alive until the send completes — a bare fire-and-forget Promise can
  // be torn down on response flush, silently dropping the status email.
  if (payload.notify !== false) {
    after(() =>
      sendStatusUpdate({
        referenceId,
        contactName: complaint.contactName,
        contactEmail: complaint.contactEmail,
        companyName: complaint.companyName,
        stepLabel: STEP_DEFS[targetStep].label,
        stepDescription: STEP_DEFS[targetStep].description,
        note: note ?? undefined,
      }).catch((e) => console.error("[advance] Status email error:", e))
    );
  }

  // Fire webhooks (best-effort, non-blocking response)
  const webhookData = {
    referenceId,
    companyName: complaint.companyName,
    previousStatus: complaint.status,
    newStatus: targetStep,
    note,
    reachedAt: new Date().toISOString(),
  };
  const filterContext = {
    status: targetStep,
    recoveryAmountKobo: complaint.recoveryAmountKobo,
    hasReferral: !!complaint.referralCode,
  };
  dispatchWebhook({ event: "case.status_changed", data: webhookData, filterContext }).catch((e) =>
    console.error("[advance] Webhook error:", e)
  );
  if (isClosing) {
    dispatchWebhook({ event: "case.closed", data: webhookData, filterContext }).catch((e) =>
      console.error("[advance] Webhook close error:", e)
    );
  }

  return NextResponse.json({ success: true, step: targetStep });
}
