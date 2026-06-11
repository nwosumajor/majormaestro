"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, Loader2, AlertCircle } from "lucide-react";

interface Opt { id: string; title?: string; fullName?: string }

export default function ApplyScholarshipPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Opt[]>([]);
  const [programmes, setProgrammes] = useState<Opt[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [programId, setProgramId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gicn/participants", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setChildren(d.items ?? [])).catch(() => {});
    fetch("/api/gicn/programs", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setProgrammes(((d.items ?? []) as (Opt & { type?: string })[]).filter((p) => p.type === "SCHOLARSHIP")))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!participantId || !programId) return setError("Select a child and a scholarship programme.");
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/scholarships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId, programId, note: note || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit your application.");
      router.push("/gicn/scholarships");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <Link href="/gicn/scholarships" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Scholarships
      </Link>
      <div>
        <h1 className="text-xl font-black text-slate-900">Apply for a scholarship</h1>
        <p className="text-sm text-slate-500">Submit an application for a child in your care. Our review board will assess it.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Child <span className="text-red-500">*</span></label>
          <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} required className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none">
            <option value="">— Select a child —</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          {children.length === 0 && <p className="mt-1 text-xs text-slate-400">No children yet — add one under <Link href="/gicn/participants" className="text-accent underline">Participants</Link> first.</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Scholarship programme <span className="text-red-500">*</span></label>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} required className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none">
            <option value="">— Select a programme —</option>
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {programmes.length === 0 && <p className="mt-1 text-xs text-slate-400">No open scholarship programmes at the moment.</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Why is your child a good fit? <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none" placeholder="A short note for the review board…" />
        </div>
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
        <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Award size={16} /> Submit application</>}
        </button>
        <p className="text-center text-xs text-slate-400">No NIN or bank details are needed to apply — those are only requested if your child is awarded. Your data is handled under NDPA 2023.</p>
      </form>
    </div>
  );
}
