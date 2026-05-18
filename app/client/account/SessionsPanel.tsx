"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, MapPin, Clock, Loader2, AlertCircle, LogOut, ShieldX } from "lucide-react";

interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function describeUA(ua: string | null): { device: "mobile" | "desktop"; label: string } {
  if (!ua) return { device: "desktop", label: "Unknown device" };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Macintosh/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  return { device: mobile ? "mobile" : "desktop", label: `${browser} on ${os}` };
}

export default function SessionsPanel() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/client/sessions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load sessions.");
      setSessions(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions.");
    }
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string, isCurrent: boolean) {
    if (isCurrent) {
      if (!confirm("Revoke this session? You'll be signed out on this device.")) return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/client/sessions/${id}/revoke`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to revoke.");
      if (isCurrent) {
        window.location.href = "/?session_revoked=1";
        return;
      }
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeAllOthers() {
    if (!confirm("Sign out everywhere except this device?")) return;
    setBusy("all");
    try {
      const res = await fetch("/api/client/sessions/revoke-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Monitor size={14} /> Active sessions
          </h2>
          <p className="mt-1 text-xs text-slate-500">Devices currently signed in to your account.</p>
        </div>
        {sessions && sessions.length > 1 && (
          <button
            onClick={revokeAllOthers}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            {busy === "all" ? <Loader2 size={11} className="animate-spin" /> : <ShieldX size={11} />}
            Sign out everywhere else
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {sessions === null ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-400">No active sessions.</p>
        ) : (
          sessions.map((s) => {
            const ua = describeUA(s.userAgent);
            const Icon = ua.device === "mobile" ? Smartphone : Monitor;
            return (
              <div key={s.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${s.current ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${s.current ? "text-emerald-700" : "text-slate-500"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{ua.label}</p>
                      {s.current && (
                        <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          This device
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                      {s.ipAddress && <span className="inline-flex items-center gap-1"><MapPin size={9} />{s.ipAddress}</span>}
                      <span className="inline-flex items-center gap-1"><Clock size={9} />Last used {fmt(s.lastUsedAt)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => revoke(s.id, s.current)}
                  disabled={busy === s.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 transition-colors"
                >
                  {busy === s.id ? <Loader2 size={10} className="animate-spin" /> : <LogOut size={10} />}
                  {s.current ? "Sign out" : "Revoke"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
