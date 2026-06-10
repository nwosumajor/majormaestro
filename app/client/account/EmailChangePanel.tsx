"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, AlertCircle, CheckCircle2, Send } from "lucide-react";

interface Props {
  currentEmail: string;
}

export default function EmailChangePanel({ currentEmail }: Props) {
  const searchParams = useSearchParams();
  const verifyError = searchParams.get("email_change_error");
  const justChanged = searchParams.get("email_changed");

  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setDevUrl(null);
    try {
      const res = await fetch("/api/client/me/email-change/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start email change.");
      setMessage(data.message ?? "Confirmation sent.");
      if (data.devVerifyUrl) setDevUrl(data.devVerifyUrl);
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Mail size={14} /> Change email
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Currently <span className="font-mono">{currentEmail}</span>. We&apos;ll send a confirmation link to the new address before swapping.
      </p>

      {verifyError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />Email change verification failed: {verifyError}
        </div>
      )}
      {justChanged && !verifyError && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 size={13} className="shrink-0" />Email updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new-address@company.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        {message && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" />{message}
          </div>
        )}
        {devUrl && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-bold">⚠ Dev mode</p>
            <a href={devUrl} className="mt-1 block break-all font-mono text-[10px] text-blue-700 underline hover:text-blue-900">{devUrl}</a>
          </div>
        )}
        <button
          type="submit"
          disabled={busy || !newEmail}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {busy ? "Sending…" : "Send confirmation to new email"}
        </button>
      </form>
    </section>
  );
}
