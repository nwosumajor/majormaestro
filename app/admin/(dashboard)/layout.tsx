import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ClipboardList, Users, UserCog, ScrollText, Webhook, Settings, BarChart3, GraduationCap } from "lucide-react";
import LogoutButton from "./LogoutButton";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromCookies();
  const role = normalizeRole(admin?.role);
  const isOwner = role === "owner";
  const canSeeCases = can(role, "cases.read"); // gates Cases / Analytics / Audit — false for gicn_manager
  const canSeeReferrals = can(role, "referrals.read");
  const canSeeGicn = can(role, "gicn.manage");

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2 text-white">
            <Image src="/logo-mark.png" alt="MajorGBN" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
            <span className="font-bold tracking-tight">MajorGBN Admin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {canSeeCases && <NavLink href="/admin" icon={LayoutDashboard} label="Cases" />}
            {canSeeCases && <NavLink href="/admin/analytics" icon={BarChart3} label="Analytics" />}
            {canSeeReferrals && <NavLink href="/admin/referrals" icon={Users} label="Referrals" />}
            {canSeeGicn && <NavLink href="/admin/gicn" icon={GraduationCap} label="GICN" />}
            {canSeeCases && <NavLink href="/admin/audit" icon={ScrollText} label="Audit" />}
            {isOwner && (
              <>
                <NavLink href="/admin/users" icon={UserCog} label="Users" />
                <NavLink href="/admin/webhooks" icon={Webhook} label="Webhooks" />
              </>
            )}
            <NavLink href="/admin/account" icon={Settings} label="Account" />
            {isOwner && (
              <a
                href="/api/admin/export/complaints"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ClipboardList size={13} />Export
              </a>
            )}
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
