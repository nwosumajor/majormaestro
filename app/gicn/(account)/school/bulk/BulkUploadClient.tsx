"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Upload, Download, CheckCircle2, FileSpreadsheet } from "lucide-react";
import Button from "@/components/ui/Button";

interface ProgramOption { id: string; title: string }
interface RejectedRow { rowNumber: number; reason: string }
interface Result { accepted: number; waitlisted: number; submitted?: number; rejected: RejectedRow[] }

export default function BulkUploadClient({ programs }: { programs: ProgramOption[] }) {
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!programId) return setError("Select an open programme.");
    if (!file) return setError("Choose an .xlsx or .csv file.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("programId", programId);
      const res = await fetch("/api/gicn/school/bulk", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (programs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No open programmes available to register into yet.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <a href="/api/gicn/school/bulk/template" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-accent hover:text-accent">
        <Download size={16} /> Download template (.xlsx)
      </a>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Register into programme</label>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none">
            {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Student spreadsheet</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 hover:border-accent">
            <FileSpreadsheet size={22} className="text-slate-400" />
            <span className="text-sm text-slate-600">{file ? file.name : "Click to choose an .xlsx or .csv file"}</span>
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}

        <Button variant="primary" size="lg" disabled={loading}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload &amp; register</>}
        </Button>
      </form>

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-accent" />
            <h2 className="font-display text-lg font-semibold text-ink">Upload complete</h2>
          </div>
          <div className={`mt-4 grid gap-3 text-center ${result.submitted ? "grid-cols-4" : "grid-cols-3"}`}>
            {result.submitted ? <Stat label="Pending approval" value={result.submitted} tone="text-slate-700" /> : null}
            <Stat label="Confirmed" value={result.accepted} tone="text-emerald-700" />
            <Stat label="Waitlisted" value={result.waitlisted} tone="text-amber-700" />
            <Stat label="Rejected" value={result.rejected.length} tone="text-red-700" />
          </div>
          {result.rejected.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Rejected rows</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {result.rejected.map((r) => <li key={r.rowNumber}>Row {r.rowNumber}: {r.reason}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className={`font-figure text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
