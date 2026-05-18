"use client";

import { useState } from "react";
import { Search, ClipboardList, CheckCircle2, Clock, AlertCircle, FileSearch, Loader2, ArrowRight, Phone } from "lucide-react";
import Link from "next/link";

interface StatusStep {
  key: string;
  label: string;
  description: string;
  reachedAt: string | null;
}

interface CaseStatus {
  referenceId: string;
  companyName: string;
  assignedTeam: string;
  currentStep: number;
  steps: StatusStep[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrackPage() {
  const [refInput, setRefInput] = useState("");
  const [status, setStatus] = useState<CaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = refInput.trim().toUpperCase();
    if (!cleaned.startsWith("GBN-")) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(`/api/recovery/track?ref=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load case status.");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-950 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <ClipboardList size={28} />
          </div>
          <h1 className="text-3xl font-black text-white">Case Tracking Portal</h1>
          <p className="mt-2 text-slate-400">Enter your reference ID below to view the current status of your recovery case.</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Search form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleTrack} className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="e.g. GBN-ABC12345-XY"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !refInput.trim().toUpperCase().startsWith("GBN-")}
              className="flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Track
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">Your reference ID was provided upon successful submission of your intake form. It begins with &quot;GBN-&quot;.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Result */}
        {status && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Case Reference</p>
                <p className="font-mono text-sm font-bold text-slate-900">{status.referenceId}</p>
                <p className="mt-1 text-xs text-slate-400">{status.companyName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Assigned To</p>
                <p className="text-sm font-semibold text-slate-700">{status.assignedTeam}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-0">
                {status.steps.map((step, i) => {
                  const done = i < status.currentStep;
                  const active = i === status.currentStep;
                  const pending = i > status.currentStep;
                  return (
                    <div key={step.key} className="flex gap-4">
                      {/* Line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-300"}`}>
                          {done ? <CheckCircle2 size={16} /> : active ? <Clock size={15} /> : <div className="h-2 w-2 rounded-full bg-current" />}
                        </div>
                        {i < status.steps.length - 1 && (
                          <div className={`mt-1 w-0.5 flex-1 min-h-[32px] ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-6 ${i === status.steps.length - 1 ? "pb-0" : ""}`}>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${done ? "text-emerald-700" : active ? "text-blue-900" : "text-slate-400"}`}>
                            {step.label}
                          </p>
                          {active && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">In Progress</span>
                          )}
                          {done && step.reachedAt && (
                            <span className="text-xs text-slate-400">{formatDate(step.reachedAt)}</span>
                          )}
                        </div>
                        {(done || active) && (
                          <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{step.description}</p>
                        )}
                        {pending && (
                          <p className="mt-0.5 text-xs text-slate-400">Pending</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-blue-600" />
              <p className="text-xs text-blue-700">
                For case-specific enquiries, contact your assigned team directly at{" "}
                <a href="mailto:forensics@majormaestro.com" className="font-semibold underline">forensics@majormaestro.com</a> quoting your reference ID.
              </p>
            </div>
          </div>
        )}

        {/* No result placeholder */}
        {!status && !error && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <FileSearch size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No case loaded</p>
            <p className="mt-1 text-xs text-slate-300">Enter your GBN reference ID above to check status</p>
          </div>
        )}

        {/* Haven't filed yet */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Don&apos;t have a reference ID yet?</p>
          <p className="mt-1 text-xs text-slate-500">Submit your complaint through our secure intake form to get started.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/recovery#intake" className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 transition-colors">
              Lodge a Complaint <ArrowRight size={14} />
            </Link>
            <a href="tel:+2348000000000" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
              <Phone size={14} /> Call Us
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
