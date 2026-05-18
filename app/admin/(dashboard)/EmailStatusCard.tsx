"use client";

import { useState } from "react";
import { Mail, CheckCircle2, AlertTriangle, Loader2, Send } from "lucide-react";

interface Props {
  configured: boolean;
  problems: string[];
  adminEmail: string | null;
}

export default function EmailStatusCard({ configured, problems, adminEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send.");
      setMessage(`Test email sent to ${data.to}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          <Mail size={16} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900">Email pipeline</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${configured && problems.length === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {configured && problems.length === 0 ? <><CheckCircle2 size={10} /> Healthy</> : <><AlertTriangle size={10} /> Check config</>}
            </span>
          </div>
          {problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleTest}
              disabled={loading || !configured}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {loading ? "Sending…" : `Send test to ${adminEmail ?? "me"}`}
            </button>
            {message && <span className="text-xs text-emerald-700">{message}</span>}
            {error && <span className="text-xs text-red-700">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
