"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Power, PowerOff, Loader2, AlertCircle, Copy, CheckCircle2, AlertTriangle, Send, History, RotateCcw, ChevronDown, ChevronRight, Filter } from "lucide-react";

interface Hook {
  id: string;
  label: string;
  url: string;
  active: boolean;
  events: string[];
  filter: Record<string, unknown> | null;
  lastSentAt: string | null;
  failCount: number;
  secretPreview: string;
}

interface Delivery {
  id: string;
  event: string;
  status: string;
  attempts: number;
  responseCode: number | null;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
}

interface Props {
  events: string[];
  statusOptions: { key: string; label: string }[];
  initialHooks: Hook[];
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  dead: "bg-slate-200 text-slate-700",
};

export default function WebhooksPanel({ events, statusOptions, initialHooks }: Props) {
  const router = useRouter();
  const [hooks, setHooks] = useState(initialHooks);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [filterMinNgn, setFilterMinNgn] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterHasReferral, setFilterHasReferral] = useState<"" | "yes" | "no">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Per-hook expanded state
  const [openHookId, setOpenHookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<Record<string, string>>({});

  function toggleEvent(e: string) {
    setSelectedEvents((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));
  }
  function toggleStatus(s: string) {
    setFilterStatuses((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  function buildFilter() {
    const f: Record<string, unknown> = {};
    if (filterMinNgn.trim() !== "") {
      const n = Number(filterMinNgn);
      if (Number.isFinite(n) && n >= 0) f.minRecoveryKobo = String(BigInt(Math.round(n * 100)));
    }
    if (filterStatuses.length > 0) f.statuses = filterStatuses;
    if (filterHasReferral === "yes") f.hasReferral = true;
    if (filterHasReferral === "no") f.hasReferral = false;
    return Object.keys(f).length === 0 ? undefined : f;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNewSecret(null);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, url, events: selectedEvents, filter: buildFilter() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create webhook.");
      setHooks((prev) => [
        ...prev,
        {
          id: data.id,
          label: data.label,
          url: data.url,
          active: data.active,
          events: data.events,
          filter: data.filter ?? null,
          lastSentAt: null,
          failCount: 0,
          secretPreview: `…${data.secret.slice(-6)}`,
        },
      ]);
      setNewSecret(data.secret);
      setLabel(""); setUrl(""); setSelectedEvents([]);
      setFilterMinNgn(""); setFilterStatuses([]); setFilterHasReferral("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(hook: Hook) {
    try {
      const res = await fetch(`/api/admin/webhooks/${hook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !hook.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setHooks((prev) => prev.map((h) => (h.id === hook.id ? { ...h, active: data.active, failCount: data.active ? 0 : h.failCount } : h)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed.");
    }
  }

  async function deleteHook(hook: Hook) {
    if (!confirm(`Delete "${hook.label}"?`)) return;
    try {
      const res = await fetch(`/api/admin/webhooks/${hook.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed.");
      setHooks((prev) => prev.filter((h) => h.id !== hook.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed.");
    }
  }

  async function copySecret() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function loadDeliveries(hookId: string) {
    setLoadingDeliveries(hookId);
    try {
      const res = await fetch(`/api/admin/webhooks/${hookId}/deliveries`);
      const data = await res.json();
      setDeliveries((p) => ({ ...p, [hookId]: data.items ?? [] }));
    } finally {
      setLoadingDeliveries(null);
    }
  }

  async function toggleHookExpand(hookId: string) {
    if (openHookId === hookId) {
      setOpenHookId(null);
      return;
    }
    setOpenHookId(hookId);
    if (!deliveries[hookId]) await loadDeliveries(hookId);
  }

  async function testFire(hookId: string) {
    setTestMessage((p) => ({ ...p, [hookId]: "Firing…" }));
    try {
      const res = await fetch(`/api/admin/webhooks/${hookId}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      const d = data.delivery;
      setTestMessage((p) => ({
        ...p,
        [hookId]: d
          ? `${d.status === "success" ? "✓" : "✗"} status=${d.status} code=${d.responseCode ?? "—"}`
          : "Sent.",
      }));
      await loadDeliveries(hookId);
    } catch (err) {
      setTestMessage((p) => ({ ...p, [hookId]: err instanceof Error ? err.message : "Failed" }));
    }
  }

  async function retryDelivery(hookId: string, deliveryId: string) {
    try {
      const res = await fetch(`/api/admin/webhooks/${hookId}/deliveries/${deliveryId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      await loadDeliveries(hookId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div className="space-y-4">
      {newSecret && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-amber-900">Save this signing secret — it will NOT be shown again.</p>
          <div className="mt-3 flex gap-2">
            <code className="flex-1 rounded bg-white border border-amber-200 px-3 py-2 font-mono text-xs break-all">{newSecret}</code>
            <button
              onClick={copySecret}
              className={`flex shrink-0 items-center gap-1.5 rounded px-3 py-2 text-xs font-bold transition-colors ${copied ? "bg-emerald-500 text-white" : "bg-amber-200 text-amber-900 hover:bg-amber-300"}`}
            >
              {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button onClick={() => setNewSecret(null)} className="mt-2 text-xs text-amber-700 underline hover:text-amber-900">Dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{hooks.length} configured {hooks.length === 1 ? "endpoint" : "endpoints"}</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? "Cancel" : "Add webhook"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Label</label>
              <input type="text" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Slack — #recovery-ops" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">HTTPS URL</label>
              <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/…" pattern="https://.*" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Subscribed events</label>
            <div className="flex flex-wrap gap-2">
              {events.map((e) => {
                const selected = selectedEvents.includes(e);
                return (
                  <button key={e} type="button" onClick={() => toggleEvent(e)} className={`rounded-full border px-3 py-1 text-xs font-mono transition-colors ${selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {e}
                  </button>
                );
              })}
            </div>
          </div>

          <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <Filter size={12} /> Filters (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Minimum recovery amount (₦)</label>
                <input type="number" min="0" step="0.01" value={filterMinNgn} onChange={(e) => setFilterMinNgn(e.target.value)} placeholder="e.g. 100000000 (only fire for cases ≥ ₦100M)" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Only fire for these statuses (any)</label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map((s) => {
                    const sel = filterStatuses.includes(s.key);
                    return (
                      <button key={s.key} type="button" onClick={() => toggleStatus(s.key)} className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${sel ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"}`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-slate-400">Leave empty to fire on all statuses.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Referral attachment</label>
                <select value={filterHasReferral} onChange={(e) => setFilterHasReferral(e.target.value as "" | "yes" | "no")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none">
                  <option value="">Any</option>
                  <option value="yes">Only cases with a referral</option>
                  <option value="no">Only cases without a referral</option>
                </select>
              </div>
            </div>
          </details>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
            </div>
          )}

          <button type="submit" disabled={loading || !label.trim() || !url.trim() || selectedEvents.length === 0} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? "Creating…" : "Create webhook"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 w-6"></th>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Events &amp; Filter</th>
              <th className="px-4 py-3">Last fired</th>
              <th className="px-4 py-3 text-right">Failures</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hooks.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No webhooks configured.</td></tr>
            ) : hooks.map((h) => {
              const expanded = openHookId === h.id;
              const deliveriesForHook = deliveries[h.id] ?? [];
              return (
                <>
                  <tr key={h.id} className={expanded ? "bg-slate-50" : ""}>
                    <td className="px-4 py-3 align-top">
                      <button onClick={() => toggleHookExpand(h.id)} className="text-slate-400 hover:text-slate-700">
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-slate-900">{h.label}</p>
                      <p className="font-mono text-xs text-slate-500 truncate max-w-md">{h.url}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">secret {h.secretPreview}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {h.events.map((e) => (
                          <span key={e} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">{e}</span>
                        ))}
                      </div>
                      {h.filter && Object.keys(h.filter).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(h.filter).map(([k, v]) => (
                            <span key={k} className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-mono text-blue-700">
                              {k}={JSON.stringify(v).slice(0, 30)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-500">{fmt(h.lastSentAt)}</td>
                    <td className="px-4 py-3 align-top text-right text-xs">
                      {h.failCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                          <AlertTriangle size={10} /> {h.failCount}
                        </span>
                      ) : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => testFire(h.id)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                          <Send size={11} /> Test
                        </button>
                        <button onClick={() => toggleActive(h)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${h.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                          {h.active ? <><Power size={11} /> Active</> : <><PowerOff size={11} /> Paused</>}
                        </button>
                        <button onClick={() => deleteHook(h)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                      {testMessage[h.id] && (
                        <p className="mt-1 text-[10px] text-slate-500">{testMessage[h.id]}</p>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${h.id}-deliveries`}>
                      <td colSpan={6} className="bg-slate-50 px-6 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <History size={13} className="text-slate-500" />
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Recent deliveries</p>
                          <button onClick={() => loadDeliveries(h.id)} disabled={loadingDeliveries === h.id} className="ml-auto text-xs text-blue-700 hover:text-blue-900 disabled:opacity-50">
                            {loadingDeliveries === h.id ? "Loading…" : "Refresh"}
                          </button>
                        </div>
                        {deliveriesForHook.length === 0 ? (
                          <p className="text-xs text-slate-400">No deliveries yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                                <tr>
                                  <th className="pr-3 pb-1">When</th>
                                  <th className="pr-3 pb-1">Event</th>
                                  <th className="pr-3 pb-1">Status</th>
                                  <th className="pr-3 pb-1">Attempts</th>
                                  <th className="pr-3 pb-1">HTTP</th>
                                  <th className="pr-3 pb-1">Next retry</th>
                                  <th className="pb-1"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {deliveriesForHook.map((d) => (
                                  <tr key={d.id}>
                                    <td className="py-1 pr-3 text-slate-500">{fmt(d.createdAt)}</td>
                                    <td className="py-1 pr-3 font-mono text-slate-700">{d.event}</td>
                                    <td className="py-1 pr-3">
                                      <span className={`inline-flex rounded-full px-1.5 py-0.5 font-semibold ${STATUS_TONES[d.status] ?? "bg-slate-100 text-slate-600"}`}>
                                        {d.status}
                                      </span>
                                    </td>
                                    <td className="py-1 pr-3 text-slate-600">{d.attempts}</td>
                                    <td className="py-1 pr-3 text-slate-500">{d.responseCode ?? "—"}</td>
                                    <td className="py-1 pr-3 text-slate-500">{fmt(d.nextAttemptAt)}</td>
                                    <td className="py-1 text-right">
                                      {(d.status === "pending" || d.status === "dead" || d.status === "failed") && (
                                        <button onClick={() => retryDelivery(h.id, d.id)} className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900">
                                          <RotateCcw size={10} /> Retry now
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
