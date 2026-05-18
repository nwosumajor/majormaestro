import Link from "next/link";
import { LayoutDashboard, ClipboardList, Users, LogOut, ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2 text-white">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span className="font-bold tracking-tight">MajorGBN Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/admin" icon={LayoutDashboard} label="Cases" />
            <NavLink href="/admin/referrals" icon={Users} label="Referrals" />
            <a
              href="/api/admin/export/complaints"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ClipboardList size={13} />Export CSV
            </a>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="ml-1 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-red-600 hover:bg-red-900/20 hover:text-red-300 transition-colors"
              >
                <LogOut size={13} />Sign out
              </button>
            </form>
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
