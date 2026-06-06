import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { displayRegStatus } from "@/lib/gicn";
import { sendGicnRegistrationApproved, sendGicnRegistrationRejected } from "@/lib/email";

const ACTIONS = ["approve", "reject", "waitlist", "review"] as const;
type Action = (typeof ACTIONS)[number];

const NEXT_STATUS: Record<Action, string> = {
  approve: "APPROVED",
  reject: "REJECTED",
  waitlist: "WAITLISTED",
  review: "UNDER_REVIEW",
};

// Admin decision on a program registration — approve / reject / waitlist / claim-for-review.
// requireAdmin gates on gicn.manage (2FA-required), so gicn_manager can use it.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "action must be one of: approve, reject, waitlist, review." }, { status: 400 });
  }
  const note = body.note?.trim() || null;

  const reg = await db.programRegistration.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      checkInCode: true,
      programId: true,
      program: { select: { title: true, capacity: true } },
      participant: { select: { fullName: true, owner: { select: { email: true } } } },
    },
  });
  if (!reg) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

  const current = displayRegStatus(reg.status);
  if (current === "CANCELLED") {
    return NextResponse.json({ error: "This registration was cancelled by the guardian." }, { status: 409 });
  }

  // Capacity guard on approval — steer the admin to the waitlist instead of overfilling.
  if (action === "approve" && reg.program.capacity != null) {
    const approved = await db.programRegistration.count({ where: { programId: reg.programId, status: "APPROVED" } });
    if (approved >= reg.program.capacity) {
      return NextResponse.json(
        { error: "Programme is at capacity. Waitlist this candidate instead, or raise the capacity.", code: "AT_CAPACITY" },
        { status: 409 }
      );
    }
  }

  await db.programRegistration.update({
    where: { id },
    data: {
      status: NEXT_STATUS[action],
      reviewedAt: new Date(),
      reviewedBy: gate.admin.email,
      ...(action === "reject" || action === "review" ? { reviewNote: note } : {}),
    },
  });

  await recordAudit({
    action: `gicn_registration_${action}`,
    actorLabel: gate.admin.email,
    targetType: "ProgramRegistration",
    targetId: id,
    metadata: { code: reg.checkInCode, from: current, note: note ?? undefined },
  });

  // Notify the guardian/school on a final decision (fire-and-forget).
  const ownerEmail = reg.participant.owner?.email;
  if (ownerEmail && (action === "approve" || action === "reject")) {
    after(() =>
      (action === "approve"
        ? sendGicnRegistrationApproved({
            ownerEmail,
            participantName: reg.participant.fullName,
            programTitle: reg.program.title,
            checkInCode: reg.checkInCode,
          })
        : sendGicnRegistrationRejected({
            ownerEmail,
            participantName: reg.participant.fullName,
            programTitle: reg.program.title,
            reason: note ?? undefined,
          })
      ).catch((e) => console.error(`[gicn-decide] ${action} email error:`, e))
    );
  }

  return NextResponse.json({ success: true, status: NEXT_STATUS[action] });
}
