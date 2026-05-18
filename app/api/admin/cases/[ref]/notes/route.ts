import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const MAX_NOTE_LENGTH = 4000;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ref: string }> }
) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ref } = await ctx.params;
  const referenceId = ref.toUpperCase();

  let body: string | undefined;
  try {
    const json = (await req.json()) as { body?: string };
    body = json.body?.trim();
  } catch {
    /* noop */
  }

  if (!body) {
    return NextResponse.json({ error: "Note body is required." }, { status: 400 });
  }
  if (body.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: `Note too long. Max ${MAX_NOTE_LENGTH} characters.` }, { status: 400 });
  }

  const complaint = await db.recoveryComplaint.findUnique({
    where: { referenceId },
    select: { id: true },
  });
  if (!complaint) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const note = await db.caseNote.create({
    data: {
      complaintId: complaint.id,
      authorEmail: admin.email,
      body,
    },
  });

  await recordAudit({
    action: "case_note_create",
    actorLabel: admin.email,
    targetType: "RecoveryComplaint",
    targetId: complaint.id,
    metadata: { referenceId, noteId: note.id },
  });

  return NextResponse.json({
    ...note,
    createdAt: note.createdAt.toISOString(),
  });
}
