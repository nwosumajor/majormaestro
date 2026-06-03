"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download, Upload, Loader2, AlertCircle, CheckCircle2, Plus, Users, ArrowLeft, FileSpreadsheet,
} from "lucide-react";
import { Container } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { track } from "@/lib/analytics";

interface Position {
  id: string;
  industryCategory: string;
  departmentName: string;
  description: string | null;
  isCustom: boolean;
}
interface RejectedRow { rowNumber: number; reason: string }

export default function BulkClassifyClient() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingPositions, setLoadingPositions] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<RejectedRow[]>([]);

  // custom position form
  const [customIndustry, setCustomIndustry] = useState("");
  const [customDept, setCustomDept] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  useEffect(() => {
    fetch("/api/client/positions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setPositions(d.items ?? []))
      .catch(() => setError("Could not load positions."))
      .finally(() => setLoadingPositions(false));
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, Position[]>();
    for (const p of positions) {
      const arr = m.get(p.industryCategory) ?? [];
      arr.push(p);
      m.set(p.industryCategory, arr);
    }
    return [...m.entries()];
  }, [positions]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addCustom() {
    if (!customIndustry.trim() || !customDept.trim()) return;
    setAddingCustom(true);
    setError(null);
    try {
      const res = await fetch("/api/client/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryCategory: customIndustry.trim(), departmentName: customDept.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add position.");
      const p: Position = data.position;
      setPositions((prev) => [...prev, p]);
      setSelected((prev) => new Set(prev).add(p.id));
      setCustomIndustry("");
      setCustomDept("");
      track("position_create");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add position.");
    } finally {
      setAddingCustom(false);
    }
  }

  async function submit() {
    setError(null);
    setRejected([]);
    if (selected.size === 0) return setError("Select at least one target position.");
    if (!file) return setError("Choose an .xlsx or .csv file.");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("positionIds", JSON.stringify([...selected]));
      const res = await fetch("/api/client/bulk-classify", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.rejected)) setRejected(data.rejected);
        throw new Error(data.error ?? "Upload failed.");
      }
      track("bulk_upload", { rows: data.accepted, positions: selected.size });
      router.push(`/client/bulk-classify/${data.batchId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <Container className="max-w-3xl">
        <Link href="/client/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>

        <div className="mb-8">
          <Badge tone="accent"><Users size={13} /> HR Bulk Tool</Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">Bulk Staff Classification</h1>
          <p className="mt-2 text-sm text-slate-600">
            Upload your staff list, choose the target positions, and we&apos;ll classify every person against your selected
            roles — each placement justified by their attributes and certifications.
          </p>
        </div>

        {/* Step 1 — template */}
        <Step n={1} title="Download the template">
          <p className="mb-4 text-sm text-slate-600">Fill one row per staff member. Keep the column headers unchanged.</p>
          <Button href="/api/client/bulk-classify/template" external variant="outline" size="md">
            <Download size={15} /> Download .xlsx template
          </Button>
        </Step>

        {/* Step 2 — positions */}
        <Step n={2} title="Select target positions">
          <p className="mb-4 text-sm text-slate-600">
            The AI will only place staff into the positions you select. {selected.size > 0 && (
              <span className="font-semibold text-accent">{selected.size} selected</span>
            )}
          </p>
          {loadingPositions ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" /> Loading catalog…</div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([industry, items]) => (
                <div key={industry}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">{industry}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((p) => {
                      const on = selected.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggle(p.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "border-accent bg-accent-soft text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-ink/30"}`}
                        >
                          {on && <CheckCircle2 size={12} />}
                          {p.departmentName}
                          {p.isCustom && <span className="text-[10px] text-slate-400">(custom)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* add custom */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">Add a custom position</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={customIndustry} onChange={(e) => setCustomIndustry(e.target.value)} placeholder="Industry (e.g. Logistics)" className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-ink focus:bg-white focus:outline-none" />
                  <input value={customDept} onChange={(e) => setCustomDept(e.target.value)} placeholder="Department (e.g. Fleet Ops)" className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-ink focus:bg-white focus:outline-none" />
                  <Button onClick={addCustom} variant="ink" size="md" disabled={addingCustom || !customIndustry.trim() || !customDept.trim()}>
                    {addingCustom ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Step>

        {/* Step 3 — upload */}
        <Step n={3} title="Upload your filled file">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 hover:border-accent">
            <FileSpreadsheet size={20} className="text-slate-400" />
            <span className="flex-1 text-sm text-slate-600">{file ? file.name : "Choose an .xlsx or .csv file"}</span>
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">Browse</span>
          </label>

          {error && (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          {rejected.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="mb-1 font-semibold">{rejected.length} row(s) rejected:</p>
              <ul className="space-y-0.5">
                {rejected.slice(0, 8).map((r) => <li key={r.rowNumber}>Row {r.rowNumber}: {r.reason}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <Button onClick={submit} variant="primary" size="lg" disabled={submitting}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Classify {selected.size > 0 ? `(${selected.size} positions)` : ""}</>}
            </Button>
          </div>
        </Step>
      </Container>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-figure text-sm font-bold text-white">{n}</span>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}
