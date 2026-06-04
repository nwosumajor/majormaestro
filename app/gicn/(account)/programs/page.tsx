import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROGRAM_TYPE_LABELS, type ProgramType } from "@/lib/gicn";
import ProgramsClient from "./ProgramsClient";

export const dynamic = "force-dynamic";

export default async function GicnProgramsPage() {
  const me = await getClientUserFromCookies();
  if (!me) redirect("/client/signin?next=/gicn/programs");
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const profile = await db.gicnProfile.findUnique({ where: { userId: me.id }, select: { id: true } });
  if (!profile) redirect("/gicn/register");

  const programs = await db.program.findMany({
    where: { status: "OPEN" },
    orderBy: { startsAt: "asc" },
    select: {
      id: true, title: true, type: true, description: true, startsAt: true, endsAt: true, capacity: true, location: true,
      _count: { select: { registrations: { where: { status: "CONFIRMED" } } } },
    },
  });

  const view = programs.map((p) => ({
    id: p.id,
    title: p.title,
    typeLabel: PROGRAM_TYPE_LABELS[p.type as ProgramType] ?? p.type,
    description: p.description,
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt.toISOString(),
    location: p.location,
    capacity: p.capacity,
    confirmed: p._count.registrations,
    spotsLeft: p.capacity != null ? Math.max(0, p.capacity - p._count.registrations) : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Open programmes</h1>
        <p className="mt-1 text-sm text-slate-500">Register your participants. Full programmes auto-add to a waitlist.</p>
      </div>
      <ProgramsClient programs={view} />
    </div>
  );
}
