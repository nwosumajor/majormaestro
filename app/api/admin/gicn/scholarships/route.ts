import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { newScholarshipReference, isScholarshipStatus } from "@/lib/scholarship";

// Scholarship review board — list/queue + board "nominate".
//
// NDPA: NIN/full account are ENCRYPTED at rest and NEVER returned here (only
// `hasNin` boolean). Reveal is a separate, step-up-gated, audited endpoint.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const statusFilter = req.nextUrl.searchParams.get("status")?.trim();
  const where = statusFilter && isScholarshipStatus(statusFilter) ? { status: statusFilter } : {};

  const [awards, counts] = await Promise.all([
    db.scholarshipAward.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, reference: true, status: true, awardAmountKobo: true, term: true, academicYear: true,
        renewalDueAt: true, ninEncrypted: true, createdAt: true,
        participant: { select: { fullName: true } },
        program: { select: { title: true } },
      },
    }),
    db.scholarshipAward.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    items: awards.map((a) => ({
      id: a.id,
      reference: a.reference,
      status: a.status,
      awardAmountNgn: Number(a.awardAmountKobo) / 100,
      term: a.term,
      academicYear: a.academicYear,
      renewalDueAt: a.renewalDueAt?.toISOString() ?? null,
      hasNin: a.ninEncrypted != null,
      participantName: a.participant.fullName,
      programTitle: a.program.title,
      createdAt: a.createdAt.toISOString(),
    })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  });
}

// Board-initiated nomination: create an award row for a participant + programme,
// entering the queue at "under_review".
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as {
    participantId?: string; programId?: string; awardAmountNgn?: number; term?: string; academicYear?: string; note?: string;
  };
  if (!b.participantId || !b.programId) return NextResponse.json({ error: "participantId and programId are required." }, { status: 400 });
  const amountNgn = Number(b.awardAmountNgn ?? 0);
  if (!Number.isFinite(amountNgn) || amountNgn < 0) return NextResponse.json({ error: "A valid award amount (₦) is required." }, { status: 400 });

  const participant = await db.participant.findUnique({ where: { id: b.participantId }, select: { id: true } });
  if (!participant) return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  const program = await db.program.findUnique({ where: { id: b.programId }, select: { id: true } });
  if (!program) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

  const award = await db.scholarshipAward.create({
    data: {
      reference: newScholarshipReference(),
      participantId: b.participantId,
      programId: b.programId,
      awardAmountKobo: BigInt(Math.round(amountNgn * 100)),
      term: b.term?.trim() || null,
      academicYear: b.academicYear?.trim() || null,
      status: "under_review",
      reviewedBy: gate.admin.email,
      reviewedAt: new Date(),
    },
    select: { id: true },
  });

  await db.scholarshipReview.create({ data: { awardId: award.id, reviewerEmail: gate.admin.email, action: "nominate", note: b.note ?? null } });
  await recordAudit({
    action: "gicn_scholarship_nominate",
    actorLabel: gate.admin.email,
    targetType: "ScholarshipAward",
    targetId: award.id,
    metadata: { participantId: b.participantId, programId: b.programId },
  });

  return NextResponse.json({ id: award.id }, { status: 201 });
}
