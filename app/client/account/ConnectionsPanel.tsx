"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Link2, Link2Off } from "lucide-react";

interface Props {
  googleLinked: boolean;
  emailVerified: boolean;
}

export default function ConnectionsPanel({ googleLinked, emailVerified }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    if (!confirm("Disconnect Google? You'll continue to access your account via magic-link email sign-ins.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/client/me/disconnect-google", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to disconnect.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Link2 size={14} /> Connected accounts
      </h2>
      <p className="mt-1 text-xs text-slate-500">Sign-in methods linked to your account.</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200">
              <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Google</p>
              <p className="text-xs text-slate-500">{googleLinked ? "Linked" : "Not linked"}</p>
            </div>
          </div>
          {googleLinked ? (
            <button
              onClick={disconnect}
              disabled={busy || !emailVerified}
              title={!emailVerified ? "Verify your email first via a magic-link sign-in" : undefined}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Link2Off size={11} />}
              {busy ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <a
              href="/api/auth/google/start?mode=client&next=/client/account"
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Link2 size={11} /> Connect
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
        </div>
      )}
      {googleLinked && !emailVerified && (
        <p className="mt-2 text-xs text-amber-700">
          To disconnect Google safely, first sign in once via a magic-link email so we know that address works.
        </p>
      )}
    </section>
  );
}
