"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, AlertCircle, X, ChevronRight } from "lucide-react";
import { PROGRAM_TYPES, PROGRAM_TYPE_LABELS, PROGRAM_STATUSES, type ProgramType } from "@/lib/gicn";

interface ProgramView {
  id: string;
  title: string;
  type: ProgramType;
  typeLabel: string;
  status: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  location: string | null;
  registrations: number;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProgramsAdmin({ programs }: { programs: ProgramView[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    await fetch(`/api/admin/gicn/programs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this programme? This removes all its registrations and certificates.")) return;
    setBusy(id);
    await fetch(`/api/admin/gicn/programs/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Programmes</h2>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
          <Plus size={14} /> New programme
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3 text-right">Regs</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No programmes yet. Create one to start registrations.</td></tr>
            ) : programs.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/gicn/${p.id}`} className="font-semibold text-slate-900 hover:text-emerald-700">{p.title}</Link>
                  <p className="text-xs text-slate-400">{p.typeLabel}{p.location ? ` · ${p.location}` : ""}{p.capacity != null ? ` · cap ${p.capacity}` : ""}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmt(p.startsAt)} – {fmt(p.endsAt)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{p.registrations}</td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    disabled={busy === p.id}
                    onChange={(e) => setStatus(p.id, e.target.value)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[p.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {PROGRAM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/gicn/${p.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Open"><ChevronRight size={16} /></Link>
                    <button onClick={() => remove(p.id)} disabled={busy === p.id} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); router.refresh(); }} />}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ title: "", type: PROGRAM_TYPES[0] as string, description: "", startsAt: "", endsAt: "", capacity: "", location: "", status: "DRAFT", requiresApproval: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gicn/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, capacity: f.capacity === "" ? null : Number(f.capacity) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create programme.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New programme</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Title</label>
            <input value={f.title} onChange={set("title")} required className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
              <select value={f.type} onChange={set("type")} className={input}>
                {PROGRAM_TYPES.map((t) => <option key={t} value={t}>{PROGRAM_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Status</label>
              <select value={f.status} onChange={set("status")} className={input}>
                {PROGRAM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
            <textarea value={f.description} onChange={set("description")} rows={2} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Starts</label>
              <input type="date" value={f.startsAt} onChange={set("startsAt")} required className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ends</label>
              <input type="date" value={f.endsAt} onChange={set("endsAt")} required className={input} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Capacity (blank = unlimited)</label>
              <input type="number" min={0} value={f.capacity} onChange={set("capacity")} className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Location</label>
              <input value={f.location} onChange={set("location")} className={input} />
            </div>
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <input type="checkbox" checked={f.requiresApproval} onChange={(e) => setF({ ...f, requiresApproval: e.target.checked })} className="mt-0.5 h-4 w-4" />
            <span><span className="font-semibold text-slate-800">Requires approval</span><br /><span className="text-xs text-slate-500">Registrations land as “Submitted” and an admin must approve them. Leave off for instant, capacity-aware confirmation.</span></span>
          </label>
          {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
          <button disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : "Create programme"}
          </button>
        </form>
      </div>
    </div>
  );
}
