import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";

// Full scholar dossier — admin, scholarship.review.
// NIN + full account number are NEVER returned (only hasNin + last4); use the
// step-up-gated reveal endpoint for payout.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const a = await db.scholarshipAward.findUnique({
    where: { id },
    select: {
      id: true, reference: true, status: true, awardAmountKobo: true, term: true, academicYear: true,
      conditionsSummary: true, renewalDueAt: true, createdAt: true, activatedAt: true, awardedAt: true,
      reviewedBy: true, reviewNote: true, suspendedReason: true,
      ninEncrypted: true, payoutBankName: true, payoutAccountLast4: true,
      participant: { select: { id: true, fullName: true, dateOfBirth: true, schoolName: true, classLevel: true, guardianName: true } },
      program: { select: { id: true, title: true } },
      reviews: { orderBy: { createdAt: "desc" }, select: { id: true, reviewerEmail: true, action: true, note: true, createdAt: true } },
      conditions: { orderBy: { createdAt: "asc" }, select: { id: true, label: true, met: true, metAt: true, metBy: true, note: true } },
      academicRecords: { orderBy: { createdAt: "desc" }, select: { id: true, term: true, academicYear: true, school: true, classLevel: true, gradeOrGpa: true, attendancePct: true, standing: true, note: true, createdAt: true } },
      disbursements: { orderBy: { createdAt: "desc" }, select: { id: true, label: true, amountKobo: true, method: true, reference: true, status: true, paidAt: true, note: true, createdAt: true } },
      documents: { orderBy: { createdAt: "desc" }, select: { id: true, documentType: true, fileName: true, fileSize: true, createdAt: true, uploadedByLabel: true } },
    },
  });
  if (!a) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    id: a.id,
    reference: a.reference,
    status: a.status,
    awardAmountNgn: Number(a.awardAmountKobo) / 100,
    term: a.term,
    academicYear: a.academicYear,
    conditionsSummary: a.conditionsSummary,
    renewalDueAt: a.renewalDueAt?.toISOString() ?? null,
    activatedAt: a.activatedAt?.toISOString() ?? null,
    awardedAt: a.awardedAt?.toISOString() ?? null,
    reviewedBy: a.reviewedBy,
    reviewNote: a.reviewNote,
    suspendedReason: a.suspendedReason,
    createdAt: a.createdAt.toISOString(),
    hasNin: a.ninEncrypted != null,
    payoutBankName: a.payoutBankName,
    payoutAccountLast4: a.payoutAccountLast4,
    participant: {
      id: a.participant.id,
      fullName: a.participant.fullName,
      dateOfBirth: a.participant.dateOfBirth.toISOString(),
      schoolName: a.participant.schoolName,
      classLevel: a.participant.classLevel,
      guardianName: a.participant.guardianName,
    },
    program: a.program,
    reviews: a.reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    conditions: a.conditions.map((c) => ({ ...c, metAt: c.metAt?.toISOString() ?? null })),
    academicRecords: a.academicRecords.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    disbursements: a.disbursements.map((d) => ({ id: d.id, label: d.label, amountNgn: Number(d.amountKobo) / 100, method: d.method, reference: d.reference, status: d.status, paidAt: d.paidAt?.toISOString() ?? null, note: d.note, createdAt: d.createdAt.toISOString() })),
    documents: a.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
  });
}
