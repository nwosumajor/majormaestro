import { notFound } from "next/navigation";
import { UserCog, ShieldCheck, KeyRound } from "lucide-react";
import { getAdminFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import AccountPanel from "./AccountPanel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await getAdminFromCookies();
  if (!me || !db) notFound();
  const user = await db.adminUser.findUnique({
    where: { id: me.id },
    select: { id: true, email: true, role: true, totpEnabled: true, lastLoginAt: true, recoveryCodeHashes: true },
  });
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <UserCog size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Account &amp; Security</h1>
          <p className="text-xs text-slate-500">{user.email} · {user.role}</p>
        </div>
      </div>

      <AccountPanel totpEnabled={user.totpEnabled} email={user.email} recoveryCodesRemaining={user.recoveryCodeHashes.length} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <KeyRound size={18} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-800">Session</h2>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Last sign-in: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-NG") : "—"}.
          Sessions expire after 7 days. Rotate <span className="font-mono">ADMIN_SESSION_SECRET</span> to invalidate all sessions immediately.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-xs text-emerald-800">
        <ShieldCheck size={14} className="mr-1.5 inline" />
        Two-factor authentication adds a 6-digit code from your authenticator app at sign-in. Strongly recommended for owners and any user with case-modification rights.
      </div>
    </div>
  );
}
