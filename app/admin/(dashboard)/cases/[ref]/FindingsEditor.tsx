"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, FileSpreadsheet, CheckCircle2 } from "lucide-react";

interface Props {
  referenceId: string;
  initialFindings: string | null;
  initialRecoveryAmountKobo: string | null; // serialised BigInt
}

export default function FindingsEditor({ referenceId, initialFindings, initialRecoveryAmountKobo }: Props) {
  const router = useRouter();
  const [findings, setFindings] = useState(initialFindings ?? "");
  const initialNgn = initialRecoveryAmountKobo
    ? (Number(BigInt(initialRecoveryAmountKobo)) / 100).toString()
    : "";
  const [recoveryNgn, setRecoveryNgn] = useState(initialNgn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const parsedNgn = recoveryNgn.trim() === "" ? null : Number(recoveryNgn);
      if (parsedNgn !== null && (!Number.isFinite(parsedNgn) || parsedNgn < 0)) {
        throw new Error("Recovery amount must be a non-negative number.");
      }
      const res = await fetch(`/api/admin/cases/${referenceId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingsSummary: findings.trim() || null,
          recoveryAmountKobo: parsedNgn === null ? null : Math.round(parsedNgn * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Recovery amount (₦)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={recoveryNgn}
          onChange={(e) => setRecoveryNgn(e.target.value)}
          placeholder="e.g. 12500000"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">Confirmed recovery quantum. Stored as kobo internally.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Findings summary
        </label>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          rows={5}
          placeholder="e.g. Audit covered Jan 2020 – Dec 2024. Excess COT charges totalling ₦X.X identified across 312 monthly cycles, benchmarked against CBN cap of ₦1/mille…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 size={13} className="shrink-0" />Saved.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
          {busy ? "Saving…" : "Save findings"}
        </button>
        <a
          href={`/api/admin/cases/${referenceId}/report.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Download PDF report
        </a>
      </div>
    </form>
  );
}
