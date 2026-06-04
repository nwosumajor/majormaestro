import Link from "next/link";
import { LayoutDashboard, ClipboardList, Users, ShieldCheck, UserCog, ScrollText, Webhook, Settings, BarChart3 } from "lucide-react";
import LogoutButton from "./LogoutButton";
import { getAdminFromCookies } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromCookies();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2 text-white">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span className="font-bold tracking-tight">MajorGBN Admin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink href="/admin" icon={LayoutDashboard} label="Cases" />
            <NavLink href="/admin/analytics" icon={BarChart3} label="Analytics" />
            <NavLink href="/admin/referrals" icon={Users} label="Referrals" />
            <NavLink href="/admin/audit" icon={ScrollText} label="Audit" />
            <NavLink href="/admin/users" icon={UserCog} label="Users" />
            <NavLink href="/admin/webhooks" icon={Webhook} label="Webhooks" />
            <NavLink href="/admin/account" icon={Settings} label="Account" />
            <a
              href="/api/admin/export/complaints"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ClipboardList size={13} />Export
            </a>
            {admin && (
              <span className="ml-2 hidden text-xs text-slate-500 md:inline">
                {admin.email}
              </span>
            )}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
    >
      <Icon size={13} />{label}
    </Link>
  );
}
