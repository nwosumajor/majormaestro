"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, AlertCircle, ShieldCheck, X, LogOut } from "lucide-react";

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Props {
  initialUsers: User[];
  currentUserId: string | null;
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function UsersPanel({ initialUsers, currentUserId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create admin.");
      setUsers((prev) => [...prev, data]);
      setEmail("");
      setPassword("");
      setRole("manager");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, email: string) {
    const code = window.prompt(`Delete admin ${email}? They lose access immediately and this cannot be undone.\n\nEnter your current 2FA code to confirm:`);
    if (!code) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepUpCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete.");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  async function handleRevoke(id: string, email: string) {
    if (!confirm(`Force sign-out ${email}? All of their active admin sessions will be invalidated immediately.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/revoke`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to revoke sessions.");
      alert(`${email} has been signed out of all sessions.`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke sessions.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} admin {users.length === 1 ? "user" : "users"}</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? "Cancel" : "Add admin"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@majormaestro.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Temporary password</label>
              <input
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="manager">Manager — works cases (read + write)</option>
                <option value="viewer">Viewer — read-only</option>
                <option value="owner">Owner — full control</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || password.length < 12}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            {loading ? "Creating…" : "Create admin"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{u.email}</p>
                  {u.id === currentUserId && <p className="text-xs text-blue-600">You</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "owner" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmt(u.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmt(u.lastLoginAt)}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUserId && (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleRevoke(u.id, u.email)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800"
                        title="Invalidate all of this admin's active sessions"
                      >
                        <LogOut size={11} /> Sign out
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
