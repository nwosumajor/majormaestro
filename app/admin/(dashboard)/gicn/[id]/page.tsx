import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import { PROGRAM_TYPE_LABELS, type ProgramType } from "@/lib/gicn";
import ProgramDetailClient from "./ProgramDetailClient";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminGicnProgramPage({ params }: { params: Promise<{ id: string }> }) {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "gicn.manage")) redirect("/admin");
  const { id } = await params;

  const program = await db.program.findUnique({
    where: { id },
    select: {
      id: true, title: true, type: true, status: true, startsAt: true, endsAt: true, capacity: true, location: true, description: true,
      registrations: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, status: true, checkInCode: true, checkedInAt: true, createdAt: true,
          participant: { select: { fullName: true, classLevel: true, guardianName: true } },
        },
      },
    },
  });
  if (!program) notFound();

  const confirmed = program.registrations.filter((r) => r.status === "CONFIRMED").length;
  const checkedIn = program.registrations.filter((r) => r.checkedInAt).length;

  const regs = program.registrations.map((r) => ({
    id: r.id,
    status: r.status,
    checkInCode: r.checkInCode,
    checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
    participantName: r.participant.fullName,
    classLevel: r.participant.classLevel,
    guardianName: r.participant.guardianName,
  }));

  return (
    <div className="space-y-6">
      <Link href="/admin/gicn" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> All programmes
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-black text-slate-900">{program.title}</h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{program.status}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{PROGRAM_TYPE_LABELS[program.type as ProgramType] ?? program.type}</p>
        {program.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{program.description}</p>}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <div className="flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" /> {fmt(program.startsAt)} – {fmt(program.endsAt)}</div>
          {program.location && <div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {program.location}</div>}
          <div className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {confirmed} confirmed{program.capacity != null ? ` / ${program.capacity}` : ""} · {checkedIn} checked in</div>
        </dl>
      </div>

      <ProgramDetailClient registrations={regs} />
    </div>
  );
}
