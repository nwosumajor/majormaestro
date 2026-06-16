"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Star } from "lucide-react";

function FeedbackForm() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (score === null) return;
    setLoading(true);
    try {
      await fetch("/api/recovery/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, score, comment: comment.trim() || undefined }),
      });
      setDone(true);
    } catch {
      setDone(true); // fail-soft: thank them regardless
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink">Thank you for your feedback</h1>
        <p className="mt-2 text-sm text-slate-600">We&apos;re grateful you chose MajorMaestro to recover your funds.</p>
        <Link href="/recovery/refer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-bright transition-colors">
          Refer another business & earn
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-xl font-semibold text-ink">How likely are you to recommend us?</h1>
      <p className="mt-1 text-sm text-slate-500">On a scale of 0–10, how likely are you to recommend MajorMaestro to another business?</p>

      <div className="mt-5 grid grid-cols-11 gap-1.5">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${score === n ? "border-accent bg-accent text-white" : "border-slate-300 bg-white text-slate-600 hover:border-accent/50"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>

      <label className="mt-5 block text-sm font-semibold text-slate-800">Anything you&apos;d like to add? <span className="font-normal text-slate-400">(optional)</span></label>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" placeholder="What did we do well? What could be better?" />

      <button type="submit" disabled={loading || score === null} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Star size={16} /> Submit feedback</>}
      </button>
    </form>
  );
}

export default function RecoveryFeedbackPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense>
        <FeedbackForm />
      </Suspense>
    </div>
  );
}
