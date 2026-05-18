"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/client/dashboard";
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devSignInUrl, setDevSignInUrl] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send sign-in link.");
      setSent(true);
      if (data.devSignInUrl) setDevSignInUrl(data.devSignInUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={24} />
        </div>
        <p className="text-base font-bold text-slate-900">Check your inbox</p>
        <p className="mt-1 text-sm text-slate-600">
          We sent a sign-in link to <span className="font-semibold">{email}</span>. It expires in 15 minutes.
        </p>
        {devSignInUrl && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-left">
            <p className="text-xs font-bold text-amber-900">⚠ Dev mode (no RESEND_API_KEY)</p>
            <p className="mt-1 text-xs text-amber-700">Email delivery skipped. Use this link to sign in:</p>
            <a href={devSignInUrl} className="mt-2 block break-all font-mono text-[11px] text-blue-700 underline hover:text-blue-900">
              {devSignInUrl}
            </a>
          </div>
        )}
        <button
          onClick={() => { setSent(false); setEmail(""); setDevSignInUrl(null); }}
          className="mt-4 text-xs text-slate-500 underline hover:text-slate-700"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <a
        href={`/api/auth/google/start?mode=client&next=${encodeURIComponent(next)}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
      >
        <GoogleLogo />
        Continue with Google
      </a>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="flex-1 h-px bg-slate-200" />
        <span>or by email</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {oauthError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{oauthError}
        </div>
      )}

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !email}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
          {loading ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Sign in to MajorGBN</h1>
          <p className="mt-1 text-sm text-slate-500">Access your dashboard, cases, and saved insights.</p>
        </div>

        <Suspense fallback={<div className="h-48 rounded-2xl border border-slate-200 bg-white" />}>
          <SignInForm />
        </Suspense>

        <p className="mt-4 text-center text-xs text-slate-500">
          New here? No setup needed — your account is created automatically on first sign-in.
        </p>
      </div>
    </main>
  );
}
