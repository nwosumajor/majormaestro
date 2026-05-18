import { db } from "@/lib/db";
import { UserCog } from "lucide-react";
import { getAdminFromCookies } from "@/lib/auth";
import UsersPanel from "./UsersPanel";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const me = await getAdminFromCookies();
  const users = await db.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <UserCog size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Admin Users</h1>
          <p className="text-xs text-slate-500">Each admin has their own login. Actions are attributed in the audit log.</p>
        </div>
      </div>

      <UsersPanel
        currentUserId={me?.id ?? null}
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
