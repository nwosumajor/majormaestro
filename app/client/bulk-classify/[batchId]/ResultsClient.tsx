"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Container } from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { track } from "@/lib/analytics";

interface ResultItem {
  rank: number;
  positionId: string | null;
  departmentName: string;
  industryCategory: string;
  confidence: number;
  reasoning: string;
}
interface StaffRow {
  id: string;
  staffName: string;
  staffRef: string | null;
  status: "pending" | "complete" | "failed";
  results: ResultItem[] | null;
  error: string | null;
}
interface Batch {
  id: string;
  label: string | null;
  status: "pending" | "processing" | "complete" | "failed";
  total: number;
  completed: number;
  classifications: StaffRow[];
}

const STATUS_TONE = {
  pending: "neutral", processing: "warning", complete: "accent", failed: "warning",
} as const;

export default function ResultsClient({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completeFired = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/client/bulk-classify/${batchId}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load batch.");
        const data: Batch = await res.json();
        if (!active) return;
        setBatch(data);
        if (data.status === "complete" || data.status === "failed") {
          if (!completeFired.current) {
            completeFired.current = true;
            track("bulk_complete", { total: data.total, status: data.status });
          }
          return; // stop polling
        }
        timer = setTimeout(poll, 3000);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load batch.");
      }
    }
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [batchId]);

  const done = batch && (batch.status === "complete" || batch.status === "failed");
  const pct = batch && batch.total > 0 ? Math.round((batch.completed / batch.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <Container className="max-w-5xl">
        <Link href="/client/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={15} /> Back to dashboard
        </Link>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {!batch && !error && (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        )}

        {batch && (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Classification Results</h1>
                  <Badge tone={STATUS_TONE[batch.status]}>{batch.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{batch.label ?? "Bulk batch"}</p>
              </div>
              {done && (
                <div className="flex gap-2">
                  <Button href={`/api/client/bulk-classify/${batchId}/export?format=xlsx`} external variant="primary" size="md">
                    <Download size={15} /> Export .xlsx
                  </Button>
                  <Button href={`/api/client/bulk-classify/${batchId}/export?format=csv`} external variant="outline" size="md">
                    <FileSpreadsheet size={15} /> CSV
                  </Button>
                </div>
              )}
            </div>

            {/* progress */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">
                  {done ? "Done" : <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin text-accent" /> Classifying…</span>}
                </span>
                <span className="font-figure text-slate-500">{batch.completed} / {batch.total}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* results table */}
            <div className="space-y-3">
              {batch.classifications.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-ink">{s.staffName}</p>
                      {s.staffRef && <p className="text-xs text-slate-400">{s.staffRef}</p>}
                    </div>
                    {s.status === "pending" && <Loader2 size={16} className="animate-spin text-slate-300" />}
                    {s.status === "complete" && <CheckCircle2 size={16} className="text-accent" />}
                    {s.status === "failed" && <Badge tone="warning">failed</Badge>}
                  </div>

                  {s.status === "failed" && <p className="text-xs text-red-600">{s.error}</p>}

                  {s.status === "complete" && s.results && (
                    <div className="space-y-2">
                      {s.results.map((r) => (
                        <div key={r.rank} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-figure text-xs font-bold text-white">{r.rank}</span>
                              <div>
                                <p className="text-sm font-semibold text-ink">{r.departmentName}</p>
                                <p className="text-xs text-slate-400">{r.industryCategory}</p>
                              </div>
                            </div>
                            <span className="font-figure text-sm font-bold text-accent">{r.confidence}%</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">{r.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Container>
    </main>
  );
}
