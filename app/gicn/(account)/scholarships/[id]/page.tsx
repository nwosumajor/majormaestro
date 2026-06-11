import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getClientUserFromCookies } from "@/lib/auth";
import ScholarshipProfileClient from "./ScholarshipProfileClient";

export const dynamic = "force-dynamic";

export default async function GuardianScholarshipPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getClientUserFromCookies();
  if (!me || !db) return null;
  const { id } = await params;

  const a = await db.scholarshipAward.findFirst({
    where: { id, participant: { ownerUserId: me.id } },
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
  if (!a) notFound();

  const dto = {
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
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/gicn/scholarships" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Scholarships
      </Link>
      <ScholarshipProfileClient award={dto} />
    </div>
  );
}
