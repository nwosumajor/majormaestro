import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function ownParticipant(userId: string, id: string) {
  if (!db) return null;
  const p = await db.participant.findUnique({ where: { id }, select: { id: true, ownerUserId: true } });
  return p && p.ownerUserId === userId ? p : null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await ownParticipant(user.id, id))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of ["fullName", "schoolName", "classLevel", "address", "guardianName", "emergencyContactName", "emergencyContactPhone"]) {
    if (typeof body[k] === "string") data[k] = (body[k] as string).trim() || null;
  }
  if (typeof body.mediaReleaseGranted === "boolean") data.mediaReleaseGranted = body.mediaReleaseGranted;
  if (typeof data.fullName === "string" && !data.fullName) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });

  await db.participant.update({ where: { id }, data });
  await recordAudit({ action: "gicn_participant_update", actorLabel: user.email, targetType: "Participant", targetId: id });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await ownParticipant(user.id, id))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.participant.delete({ where: { id } }); // cascades registrations + awards
  await recordAudit({ action: "gicn_participant_delete", actorLabel: user.email, targetType: "Participant", targetId: id });
  return NextResponse.json({ success: true });
}
