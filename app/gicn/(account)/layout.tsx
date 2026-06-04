import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, Upload, HeartHandshake, ArrowLeft } from "lucide-react";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Route-group guard for all signed-in GICN account pages. Account holders are
// always adults (guardian or school partner) — minors never authenticate.
export default async function GicnAccountLayout({ children }: { children: React.ReactNode }) {
  const me = await getClientUserFromCookies();
  if (!me) redirect(`/client/signin?next=${encodeURIComponent("/gicn/dashboard")}`);

  let kind: string | null = null;
  if (db) {
    const profile = await db.gicnProfile.findUnique({ where: { userId: me.id }, select: { kind: true } });
    kind = profile?.kind ?? null;
  }

  const nav = [
    { href: "/gicn/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/gicn/participants", label: "Participants", icon: Users },
    { href: "/gicn/programs", label: "Programmes", icon: CalendarDays },
    ...(kind === "school" ? [{ href: "/gicn/school/bulk", label: "Bulk register", icon: Upload }] : []),
    { href: "/gicn/sponsor", label: "Sponsor", icon: HeartHandshake },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/gicn" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
            <ArrowLeft size={16} /> GICN
          </Link>
          <span className="truncate text-sm text-slate-500">{me.email}</span>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-accent"
              >
                <item.icon size={16} /> {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
