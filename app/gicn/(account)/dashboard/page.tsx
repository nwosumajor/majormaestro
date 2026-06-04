import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, CalendarDays, HeartHandshake, ArrowRight, Upload, ShieldCheck } from "lucide-react";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function GicnDashboardPage() {
  const me = await getClientUserFromCookies();
  if (!me) redirect("/client/signin?next=/gicn/dashboard");
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const profile = await db.gicnProfile.findUnique({
    where: { userId: me.id },
    select: { kind: true, organizationName: true },
  });
  if (!profile) redirect("/gicn/register");

  const [participantCount, registrations, sponsorships] = await Promise.all([
    db.participant.count({ where: { ownerUserId: me.id } }),
    db.programRegistration.findMany({
      where: { participant: { ownerUserId: me.id } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        checkInCode: true,
        checkedInAt: true,
        participant: { select: { fullName: true } },
        program: { select: { title: true, startsAt: true } },
      },
    }),
    db.sponsorship.findMany({
      where: { sponsorUserId: me.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, amountKobo: true, status: true, createdAt: true, program: { select: { title: true } } },
    }),
  ]);

  const isSchool = profile.kind === "school";
  const ngn = (kobo: bigint) => `₦${(Number(kobo) / 100).toLocaleString("en-NG")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {isSchool ? profile.organizationName || "School partner" : "Your GICN account"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSchool ? "School partner" : "Parent / guardian"} · {me.email}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label={isSchool ? "Students" : "Children"} value={participantCount} href="/gicn/participants" />
        <StatCard icon={CalendarDays} label="Registrations" value={registrations.length} href="/gicn/programs" />
        <StatCard icon={HeartHandshake} label="Sponsorships" value={sponsorships.length} href="/gicn/sponsor" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/gicn/participants" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
          <Users size={16} /> {isSchool ? "Manage students" : "Add a child"}
        </Link>
        {isSchool && (
          <Link href="/gicn/school/bulk" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-accent hover:text-accent">
            <Upload size={16} /> Bulk register
          </Link>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink">Recent registrations</h2>
        {registrations.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No registrations yet.{" "}
            <Link href="/gicn/programs" className="font-semibold text-accent hover:underline">Browse programmes <ArrowRight size={13} className="inline" /></Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {registrations.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{r.participant.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{r.program.title}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{r.checkInCode}</code>
                  <StatusPill status={r.checkedInAt ? "CHECKED IN" : r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sponsorships.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">Your sponsorships</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {sponsorships.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-slate-600">{s.program?.title ?? "General fund"}</span>
                <span className="flex items-center gap-3">
                  <strong className="font-figure text-ink">{ngn(s.amountKobo)}</strong>
                  <StatusPill status={s.status.toUpperCase()} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
        All participant data is handled under NDPA 2023. Children never hold accounts — every record here is owned and consented to by you as the adult account holder.
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-accent">
      <Icon size={20} className="text-accent" />
      <p className="mt-3 font-figure text-3xl font-semibold text-ink">{value}</p>
      <p className="text-sm text-slate-500 group-hover:text-accent">{label}</p>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "CONFIRMED" || status === "CHECKED IN" || status === "PAID"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "WAITLISTED" || status === "PENDING"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}
