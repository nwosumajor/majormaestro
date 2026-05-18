"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, AlertCircle, ArrowRight } from "lucide-react";
import { STEP_KEYS, STEP_DEFS, type StepKey } from "@/lib/recoverySteps";

interface Props {
  referenceId: string;
  currentStatus: string;
  reachedSteps: string[];
}

export default function AdvanceForm({ referenceId, currentStatus, reachedSteps }: Props) {
  const router = useRouter();
  const remaining = STEP_KEYS.filter((k) => !reachedSteps.includes(k));
  const defaultNext = remaining[0] ?? null;

  const [step, setStep] = useState<StepKey | "">(defaultNext ?? "");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cases/${referenceId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, note: note.trim() || undefined, notify }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to advance case.");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance case.");
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === "recovered") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        This case has reached its final step. No further progressions are possible.
      </div>
    );
  }

  if (remaining.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Advance to step
        </label>
        <select
          value={step}
          onChange={(e) => setStep(e.target.value as StepKey)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          {remaining.map((k) => (
            <option key={k} value={k}>{STEP_DEFS[k].label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Note for the client <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Audit covered Jan 2020 – Dec 2024. Findings report expected by Friday."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-emerald-600"
        />
        Email the client about this status change
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !step}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : notify ? <Send size={15} /> : <ArrowRight size={15} />}
        {loading ? "Advancing…" : notify ? "Advance & Notify Client" : "Advance (Silent)"}
      </button>
    </form>
  );
}
