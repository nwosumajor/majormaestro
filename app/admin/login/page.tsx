"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, Loader2, AlertCircle, KeyRound, LifeBuoy } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(useRecovery
            ? { recoveryCode: recoveryCode || undefined }
            : { totp: totp || undefined }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.totpRequired) {
          setNeedsTotp(true);
          setError(data.error ?? "Authenticator code required.");
          return;
        }
        throw new Error(data.error ?? "Login failed.");
      }
      router.push(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const oauthError = searchParams.get("error");

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
      <a
        href={`/api/auth/google/start?mode=admin${next !== "/admin" ? `&next=${encodeURIComponent(next)}` : ""}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Sign in with Google
      </a>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <div className="flex-1 h-px bg-slate-800" />
        <span>or sign in with email</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>
      {oauthError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{oauthError}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@majormaestro.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
          />
        </div>
      </div>

      {needsTotp && !useRecovery && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Authenticator code</label>
          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={8}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="123456"
              className="w-full rounded-xl border border-emerald-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm font-mono tracking-widest text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
          <button
            type="button"
            onClick={() => { setUseRecovery(true); setError(null); }}
            className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <LifeBuoy size={11} /> Use a recovery code instead
          </button>
        </div>
      )}

      {needsTotp && useRecovery && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Recovery code</label>
          <div className="relative">
            <LifeBuoy size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
            <input
              type="text"
              autoFocus
              maxLength={20}
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="XXXXX-XXXXX"
              className="w-full rounded-xl border border-amber-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm font-mono uppercase tracking-widest text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>
          <button
            type="button"
            onClick={() => { setUseRecovery(false); setError(null); }}
            className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <KeyRound size={11} /> Use authenticator code instead
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password || (needsTotp && !useRecovery && !totp) || (needsTotp && useRecovery && !recoveryCode)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
        {loading ? "Signing in…" : needsTotp ? "Verify & Sign In" : "Sign In"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Image src="/logo-white.png" alt="MajorGBN" width={200} height={178} priority className="mx-auto mb-3 h-auto w-36" />
          <h1 className="text-xl font-black text-white">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-400">Authorised personnel only.</p>
        </div>

        <Suspense fallback={<div className="h-48 rounded-2xl border border-slate-800 bg-slate-900" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-4 text-center text-xs text-slate-600">
          All admin actions are logged for compliance.
        </p>
      </div>
    </main>
  );
}
