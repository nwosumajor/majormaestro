import Link from "next/link";
import { db } from "@/lib/db";
import { ScrollText, Filter } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  admin_login_success: { label: "Login", tone: "bg-emerald-100 text-emerald-700" },
  admin_login_failed: { label: "Login failed", tone: "bg-red-100 text-red-700" },
  admin_logout: { label: "Logout", tone: "bg-slate-100 text-slate-600" },
  admin_user_create: { label: "Admin created", tone: "bg-blue-100 text-blue-700" },
  admin_user_delete: { label: "Admin deleted", tone: "bg-red-100 text-red-700" },
  case_advance: { label: "Case advanced", tone: "bg-violet-100 text-violet-700" },
  case_note_create: { label: "Note added", tone: "bg-amber-100 text-amber-700" },
  complaints_export: { label: "CSV export", tone: "bg-blue-100 text-blue-700" },
  document_download: { label: "Document download", tone: "bg-blue-100 text-blue-700" },
  email_test: { label: "Email test", tone: "bg-emerald-100 text-emerald-700" },
  data_export_request: { label: "Client data export", tone: "bg-indigo-100 text-indigo-700" },
};

function fmt(d: Date) {
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "medium" });
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; targetId?: string }>;
}) {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const { action, actor, targetId } = await searchParams;

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (actor) where.actorLabel = { contains: actor, mode: "insensitive" };
  if (targetId) where.targetId = targetId;

  const [entries, total, allActions] = await Promise.all([
    db.auditLog.findMany({
      where,
      take: 200,
      orderBy: { createdAt: "desc" },
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ScrollText size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Audit Log</h1>
          <p className="text-xs text-slate-500">
            {total.toLocaleString()} {total === 1 ? "entry" : "entries"} match the current filter. Showing latest 200.
          </p>
        </div>
      </div>

      <form method="GET" className="flex flex-wrap gap-2">
        <select
          name="action"
          defaultValue={action ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="">All actions</option>
          {allActions.map((a) => (
            <option key={a.action} value={a.action}>{ACTION_LABELS[a.action]?.label ?? a.action}</option>
          ))}
        </select>
        <input
          name="actor"
          defaultValue={actor ?? ""}
          placeholder="Actor (email contains…)"
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        <input
          name="targetId"
          defaultValue={targetId ?? ""}
          placeholder="Target ID (exact)"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Filter size={13} />Filter
        </button>
        {(action || actor || targetId) && (
          <Link href="/admin/audit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">No audit entries match the filter.</td></tr>
            ) : entries.map((e) => {
              const def = ACTION_LABELS[e.action] ?? { label: e.action, tone: "bg-slate-100 text-slate-700" };
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${def.tone}`}>
                      {def.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">{e.actorLabel}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {e.targetType ? (
                      <>
                        <span className="font-semibold">{e.targetType}</span>
                        {e.targetId && <span className="ml-1 font-mono text-slate-400">#{e.targetId.slice(0, 8)}</span>}
                      </>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {e.metadata ? (
                      <code className="block max-w-md truncate font-mono">{JSON.stringify(e.metadata)}</code>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
