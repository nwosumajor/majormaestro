import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { newScholarshipReference } from "@/lib/scholarship";
import { sendScholarshipApplicationReceived } from "@/lib/email";

// Guardian's own scholarships — list (their participants' awards).
export async function GET(req: NextRequest) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const awards = await db.scholarshipAward.findMany({
    where: { participant: { ownerUserId: user.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, reference: true, status: true, awardAmountKobo: true, term: true, renewalDueAt: true,
      participant: { select: { fullName: true } }, program: { select: { title: true } },
    },
  });

  return NextResponse.json({
    items: awards.map((a) => ({
      id: a.id,
      reference: a.reference,
      status: a.status,
      awardAmountNgn: Number(a.awardAmountKobo) / 100,
      term: a.term,
      renewalDueAt: a.renewalDueAt?.toISOString() ?? null,
      childName: a.participant.fullName,
      programTitle: a.program.title,
    })),
  });
}

// Guardian applies for a scholarship on behalf of their own child.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(`gicn-scholar-apply:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });

  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as { participantId?: string; programId?: string; note?: string };
  if (!b.participantId || !b.programId) return NextResponse.json({ error: "Select a child and a scholarship programme." }, { status: 400 });

  // Ownership: the participant must belong to this guardian.
  const participant = await db.participant.findFirst({ where: { id: b.participantId, ownerUserId: user.id }, select: { id: true, fullName: true } });
  if (!participant) return NextResponse.json({ error: "Child not found in your account." }, { status: 404 });

  const program = await db.program.findUnique({ where: { id: b.programId }, select: { id: true, title: true, type: true } });
  if (!program) return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  if (program.type !== "SCHOLARSHIP") return NextResponse.json({ error: "That programme is not a scholarship." }, { status: 400 });

  // One open application per child+programme.
  const existing = await db.scholarshipAward.findFirst({
    where: { participantId: participant.id, programId: program.id, status: { in: ["applied", "under_review", "awarded", "onboarding", "active", "suspended"] } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "There is already an active application/award for this child and programme." }, { status: 409 });

  const award = await db.scholarshipAward.create({
    data: { reference: newScholarshipReference(), participantId: participant.id, programId: program.id, awardAmountKobo: BigInt(0), status: "applied", appliedByUserId: user.id },
    select: { id: true },
  });
  await db.scholarshipReview.create({ data: { awardId: award.id, reviewerEmail: "guardian", action: "apply", note: b.note?.trim() || null } });
  await recordAudit({ action: "gicn_scholarship_apply", actorLabel: user.email, targetType: "ScholarshipAward", targetId: award.id, metadata: { participantId: participant.id, programId: program.id } });

  after(() => sendScholarshipApplicationReceived(user.email, { childName: participant.fullName, programTitle: program.title }).catch((e) => console.error("[scholar-apply] email error:", e)));

  return NextResponse.json({ id: award.id }, { status: 201, headers: rateLimitHeaders(rl) });
}
