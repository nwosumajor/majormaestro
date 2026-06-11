import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";

// Guardian's read-only monitored profile for one of their own scholarships.
// Ownership-enforced; NIN/full account are never returned (only hasNin/last4).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const a = await db.scholarshipAward.findFirst({
    where: { id, participant: { ownerUserId: user.id } },
    select: {
      id: true, reference: true, status: true, awardAmountKobo: true, term: true, academicYear: true,
      conditionsSummary: true, renewalDueAt: true, suspendedReason: true,
      ninEncrypted: true, payoutBankName: true, payoutAccountLast4: true,
      participant: { select: { fullName: true } },
      program: { select: { title: true } },
      conditions: { orderBy: { createdAt: "asc" }, select: { id: true, label: true, met: true } },
      academicRecords: { orderBy: { createdAt: "desc" }, select: { id: true, term: true, academicYear: true, gradeOrGpa: true, attendancePct: true, standing: true } },
      disbursements: { orderBy: { createdAt: "desc" }, select: { id: true, label: true, amountKobo: true, status: true, paidAt: true } },
      documents: { orderBy: { createdAt: "desc" }, select: { id: true, documentType: true, fileName: true, createdAt: true } },
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
    suspendedReason: a.suspendedReason,
    childName: a.participant.fullName,
    programTitle: a.program.title,
    hasNin: a.ninEncrypted != null,
    payoutBankName: a.payoutBankName,
    payoutAccountLast4: a.payoutAccountLast4,
    conditions: a.conditions,
    academicRecords: a.academicRecords,
    disbursements: a.disbursements.map((d) => ({ id: d.id, label: d.label, amountNgn: Number(d.amountKobo) / 100, status: d.status, paidAt: d.paidAt?.toISOString() ?? null })),
    documents: a.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
  });
}
