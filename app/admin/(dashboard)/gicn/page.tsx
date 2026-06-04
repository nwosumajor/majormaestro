import { redirect } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Users, CalendarDays, GraduationCap } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import { PROGRAM_TYPE_LABELS, type ProgramType } from "@/lib/gicn";
import ProgramsAdmin from "./ProgramsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminGicnPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "gicn.manage")) redirect("/admin");

  const [programs, participantCount, sponsorships] = await Promise.all([
    db.program.findMany({
      orderBy: { startsAt: "desc" },
      select: {
        id: true, title: true, type: true, status: true, startsAt: true, endsAt: true, capacity: true, location: true,
        _count: { select: { registrations: true } },
      },
    }),
    db.participant.count(),
    db.sponsorship.aggregate({ _sum: { amountKobo: true }, _count: true, where: { status: "paid" } }),
  ]);

  const view = programs.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type as ProgramType,
    typeLabel: PROGRAM_TYPE_LABELS[p.type as ProgramType] ?? p.type,
    status: p.status,
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt.toISOString(),
    capacity: p.capacity,
    location: p.location,
    registrations: p._count.registrations,
  }));

  const raisedNgn = Number(sponsorships._sum.amountKobo ?? BigInt(0)) / 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <GraduationCap size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">GICN — Youth Programmes</h1>
          <p className="text-xs text-slate-500">Manage programmes, registrations, check-in and sponsorship. Separate from forensic recovery.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={CalendarDays} label="Programmes" value={programs.length} />
        <Stat icon={Users} label="Participants" value={participantCount} />
        <Link href="/admin/gicn/sponsorships" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300">
          <HeartHandshake size={18} className="text-emerald-600" />
          <p className="mt-2 text-2xl font-black text-slate-900">₦{raisedNgn.toLocaleString("en-NG")}</p>
          <p className="text-xs text-slate-500">Sponsorship raised ({sponsorships._count} paid)</p>
        </Link>
      </div>

      <ProgramsAdmin programs={view} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon size={18} className="text-emerald-600" />
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
