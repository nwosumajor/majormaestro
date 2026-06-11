import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import { ageFromDob } from "@/lib/gicn";
import ScholarshipDossier from "./ScholarshipDossier";

export const dynamic = "force-dynamic";

export default async function ScholarshipDossierPage({ params }: { params: Promise<{ id: string }> }) {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "scholarship.review")) redirect("/admin");
  const canDisburse = can(role, "scholarship.disburse");
  const { id } = await params;

  const a = await db.scholarshipAward.findUnique({
    where: { id },
    select: {
      id: true, reference: true, status: true, awardAmountKobo: true, term: true, academicYear: true,
      conditionsSummary: true, renewalDueAt: true, suspendedReason: true, reviewNote: true,
      ninEncrypted: true, payoutBankName: true, payoutAccountLast4: true, payoutAccountEncrypted: true,
      participant: { select: { fullName: true, dateOfBirth: true, schoolName: true, classLevel: true, guardianName: true } },
      program: { select: { title: true } },
      reviews: { orderBy: { createdAt: "desc" }, select: { id: true, reviewerEmail: true, action: true, note: true, createdAt: true } },
      conditions: { orderBy: { createdAt: "asc" }, select: { id: true, label: true, met: true, metBy: true, note: true } },
      academicRecords: { orderBy: { createdAt: "desc" }, select: { id: true, term: true, academicYear: true, school: true, gradeOrGpa: true, attendancePct: true, standing: true, note: true } },
      disbursements: { orderBy: { createdAt: "desc" }, select: { id: true, label: true, amountKobo: true, method: true, reference: true, status: true, paidAt: true } },
      documents: { orderBy: { createdAt: "desc" }, select: { id: true, documentType: true, fileName: true, createdAt: true, uploadedByLabel: true } },
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
    reviewNote: a.reviewNote,
    hasNin: a.ninEncrypted != null,
    hasAccount: a.payoutAccountEncrypted != null,
    payoutBankName: a.payoutBankName,
    payoutAccountLast4: a.payoutAccountLast4,
    participant: {
      fullName: a.participant.fullName,
      age: ageFromDob(a.participant.dateOfBirth),
      schoolName: a.participant.schoolName,
      classLevel: a.participant.classLevel,
      guardianName: a.participant.guardianName,
    },
    programTitle: a.program.title,
    reviews: a.reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    conditions: a.conditions,
    academicRecords: a.academicRecords,
    disbursements: a.disbursements.map((d) => ({ id: d.id, label: d.label, amountNgn: Number(d.amountKobo) / 100, method: d.method, reference: d.reference, status: d.status, paidAt: d.paidAt?.toISOString() ?? null })),
    documents: a.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    canDisburse,
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/gicn/scholarships" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Scholarship board
      </Link>
      <ScholarshipDossier award={dto} />
    </div>
  );
}
