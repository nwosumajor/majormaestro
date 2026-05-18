"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, ShieldOff, KeyRound, Loader2, AlertCircle, CheckCircle2, ScanLine } from "lucide-react";

interface Props {
  totpEnabled: boolean;
  email: string;
}

interface SetupData {
  qrDataUrl: string;
  manualEntryKey: string;
}

export default function AccountPanel({ totpEnabled }: Props) {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [passwordToDisable, setPasswordToDisable] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Password change state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/account/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start 2FA setup.");
      setSetup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/account/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setMessage("Two-factor authentication enabled.");
      setSetup(null);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordToDisable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to disable.");
      setMessage("Two-factor authentication disabled.");
      setPasswordToDisable("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwError(null);
    setPwMessage(null);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to change password.");
      setPwMessage("Password updated.");
      setPwCurrent("");
      setPwNew("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* 2FA card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${totpEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {totpEnabled ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Two-factor authentication</h2>
              <p className="text-xs text-slate-500">
                Status: {totpEnabled ? <span className="font-semibold text-emerald-700">Enabled</span> : <span className="font-semibold text-amber-700">Disabled</span>}
              </p>
            </div>
          </div>
        </div>

        {message && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div>}
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        {!totpEnabled && !setup && (
          <button
            onClick={startSetup}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ScanLine size={12} />}
            {busy ? "Generating…" : "Set up 2FA"}
          </button>
        )}

        {!totpEnabled && setup && (
          <form onSubmit={confirmEnable} className="mt-4 space-y-3">
            <p className="text-xs text-slate-600">
              Scan this QR with your authenticator (Google Authenticator, 1Password, Authy…) then enter the 6-digit code to confirm.
            </p>
            <div className="flex flex-wrap items-start gap-4">
              <Image src={setup.qrDataUrl} alt="2FA QR code" width={160} height={160} className="rounded-lg border border-slate-200 bg-white" unoptimized />
              <div className="text-xs">
                <p className="font-semibold text-slate-600">Manual entry key:</p>
                <code className="mt-1 block break-all rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">{setup.manualEntryKey}</code>
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tracking-widest focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="ml-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {busy ? "Verifying…" : "Verify & Enable"}
            </button>
          </form>
        )}

        {totpEnabled && (
          <form onSubmit={disable} className="mt-4 space-y-2">
            <p className="text-xs text-slate-600">To disable 2FA, confirm your password.</p>
            <input
              type="password"
              required
              value={passwordToDisable}
              onChange={(e) => setPasswordToDisable(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !passwordToDisable}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
              {busy ? "Disabling…" : "Disable 2FA"}
            </button>
          </form>
        )}
      </div>

      {/* Password card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Change password</h2>
            <p className="text-xs text-slate-500">Minimum 12 characters. Use a passphrase manager.</p>
          </div>
        </div>

        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Current password</label>
            <input
              type="password"
              required
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">New password</label>
            <input
              type="password"
              required
              minLength={12}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          {pwMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{pwMessage}</div>}
          {pwError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />{pwError}
            </div>
          )}

          <button
            type="submit"
            disabled={pwBusy || !pwCurrent || pwNew.length < 12}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            {pwBusy ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
