"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  ChevronRight,
  Award,
  Lightbulb,
  Clock,
  RefreshCw,
  Save,
  Copy,
  Download,
  CheckCircle2,
  Circle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Info,
  Send,
  Sparkles,
} from "lucide-react";
import type { RoadmapStep, RoadmapInput } from "@/types";
import { saveRoadmapSmart, updateRoadmapMilestonesSmart } from "@/lib/clientStorage";

const TIME_OPTIONS = [1, 2, 3, 5, 7, 10, 15] as const;

interface ChatMessage { role: "user" | "assistant"; content: string; }

function ChatPanel({ results, input }: { results: RoadmapStep[]; input: RoadmapInput }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const context = { type: "roadmap", results, input };

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || isLoading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setChatInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let reply = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: reply }]);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-accent/20 bg-accent-soft overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-accent hover:bg-accent-soft transition-colors">
        <span className="flex items-center gap-2"><MessageSquare size={16} />Ask AI about your roadmap</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="border-t border-accent/20 bg-white">
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-xs text-slate-400 text-center pt-8">Ask anything about your career roadmap…</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-accent text-white" : "bg-slate-100 text-slate-800"}`}>{m.content}</div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && <div className="flex justify-start"><div className="rounded-xl bg-slate-100 px-4 py-2.5"><Loader2 size={14} className="animate-spin text-slate-400" /></div></div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-slate-200 p-3">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="e.g. Which certification should I prioritise first?" className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
            <button type="submit" aria-label="Send message" disabled={isLoading || !chatInput.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-bright disabled:opacity-50 transition-colors"><Send size={15} aria-hidden="true" /></button>
          </form>
        </div>
      )}
    </div>
  );
}

function RoadmapContent() {
  const searchParams = useSearchParams();
  const preCurrentRole = searchParams.get("currentRole") ?? "";
  const preTargetRole = searchParams.get("targetRole") ?? "";
  const fromBridge = searchParams.get("fromBridge") === "true";

  const [currentRole, setCurrentRole] = useState(preCurrentRole);
  const [currentIndustry, setCurrentIndustry] = useState("");
  const [currentExperience, setCurrentExperience] = useState("");
  const [futureRole, setFutureRole] = useState(preTargetRole);
  const [timeHorizon, setTimeHorizon] = useState<number>(5);
  const [results, setResults] = useState<RoadmapStep[] | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [completedMilestones, setCompletedMilestones] = useState<number[]>([]);
  const [expandedCerts, setExpandedCerts] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preCurrentRole) setCurrentRole(preCurrentRole);
    if (preTargetRole) setFutureRole(preTargetRole);
  }, [preCurrentRole, preTargetRole]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setSaved(false);
    setSavedId(null);
    setCompletedMilestones([]);
    setExpandedCerts([]);
    setLoading(true);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRole, currentIndustry, currentExperience, futureRole, timeHorizon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResults(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMilestone(index: number) {
    const next = completedMilestones.includes(index)
      ? completedMilestones.filter((i) => i !== index)
      : [...completedMilestones, index];
    setCompletedMilestones(next);
    if (savedId) {
      // Fire-and-forget — the UI update is already committed via setState.
      void updateRoadmapMilestonesSmart(savedId, next);
    }
  }

  function toggleCerts(index: number) {
    setExpandedCerts((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);
  }

  async function handleSave() {
    if (!results) return;
    const record = await saveRoadmapSmart({
      label: `${currentRole} → ${futureRole} (${timeHorizon}yr)`,
      input: { currentRole, currentIndustry, currentExperience, futureRole, timeHorizon },
      results,
      completedMilestones,
    });
    setSavedId(record.id);
    setSaved(true);
  }

  async function handleCopy() {
    if (!results) return;
    const text = results.map((s, i) =>
      `[${s.timeframe}] ${s.milestoneName}\nSalary: ${s.salaryRange.range}\n${s.strategicReasoning}\nCertifications: ${s.recommendedCertifications.map((c) => c.name).join(", ") || "None"}`
    ).join("\n\n");
    await navigator.clipboard.writeText(`${currentRole} → ${futureRole} (${timeHorizon}-year plan)\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport() {
    if (!resultsRef.current) return;
    setExportLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
      pdf.save(`roadmap-${Date.now()}.pdf`);
    } finally {
      setExportLoading(false);
    }
  }

  const isFormValid = currentRole.trim().length > 0 && futureRole.trim().length > 0;
  const completedCount = completedMilestones.length;
  const totalCount = results?.length ?? 0;
  const currentInput: RoadmapInput = { currentRole, currentIndustry, currentExperience, futureRole, timeHorizon };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
          <TrendingUp size={24} />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Strategic Career Partner</h1>
        <p className="mt-2 text-base text-slate-600">Define your current role and your target. The AI builds a phased, milestone-driven roadmap with certifications, salary bands, and strategic reasoning at every stage.</p>
      </div>

      {fromBridge && preTargetRole && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
          <Sparkles size={15} className="shrink-0" />
          <span>Pre-filled from your classification result: <strong>{preTargetRole}</strong> as your target. Review and adjust before generating.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current State */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Current State</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Role / Position <span className="text-red-500">*</span></label>
              <input type="text" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="e.g. Junior Software Engineer, Graduate Analyst…" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Industry</label>
                <input type="text" value={currentIndustry} onChange={(e) => setCurrentIndustry(e.target.value)} placeholder="e.g. Banking, Tech, FMCG…" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Years of Experience</label>
                <input type="number" min={0} max={50} value={currentExperience} onChange={(e) => setCurrentExperience(e.target.value)} placeholder="e.g. 3" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
              </div>
            </div>
          </div>
        </div>

        {/* Future State */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Future State</h2>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Target Role / Position <span className="text-red-500">*</span></label>
              <input type="text" value={futureRole} onChange={(e) => setFutureRole(e.target.value)} placeholder="e.g. Chief Technology Officer, Head of Risk, VP of Product…" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
            </div>
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Time Horizon</label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((yr) => (
                  <button key={yr} type="button" onClick={() => setTimeHorizon(yr)} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${timeHorizon === yr ? "border-accent bg-accent text-white" : "border-slate-300 bg-white text-slate-600 hover:border-accent/50 hover:text-accent"}`}>
                    {yr} {yr === 1 ? "year" : "years"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading || !isFormValid} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <><Loader2 size={16} className="animate-spin" />Building your roadmap…</> : <><TrendingUp size={16} />Generate Roadmap<ChevronRight size={16} /></>}
        </button>
      </form>

      {error && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div ref={resultsRef} className="mt-12">
          {/* Results header */}
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your Career Roadmap</h2>
              <p className="mt-0.5 text-sm text-slate-500">{currentRole} → {futureRole}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSave} disabled={saved} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${saved ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600 hover:border-accent/50 hover:text-accent"}`}>
                {saved ? <><CheckCircle2 size={13} />Saved</> : <><Save size={13} />Save</>}
              </button>
              <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-accent/50 hover:text-accent transition-colors">
                {copied ? <><CheckCircle2 size={13} />Copied!</> : <><Copy size={13} />Copy Summary</>}
              </button>
              <button onClick={handleExport} disabled={exportLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-accent/50 hover:text-accent transition-colors disabled:opacity-60">
                {exportLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}Export PDF
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className="text-xs font-semibold text-slate-600">{timeHorizon}-year plan · {totalCount} milestones</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-accent-soft0 transition-all duration-500" style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }} />
            </div>
            <span className="text-xs font-semibold text-accent">{completedCount}/{totalCount} done</span>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-accent via-accent/60 to-accent/20" />
            <ol className="space-y-0">
              {results.map((step, i) => {
                const done = completedMilestones.includes(i);
                const certsOpen = expandedCerts.includes(i);
                return (
                  <li key={i} className="relative flex gap-6 pb-8 last:pb-0">
                    {/* Node */}
                    <button type="button" onClick={() => toggleMilestone(i)} className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition-all ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-accent bg-white text-accent hover:bg-accent-soft"}`} title={done ? "Mark incomplete" : "Mark complete"}>
                      {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>

                    {/* Card */}
                    <div className={`flex-1 rounded-xl border p-5 shadow-sm transition-all ${done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className={`text-base font-bold ${done ? "line-through text-slate-400" : "text-slate-900"}`}>{step.milestoneName}</p>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-accent">
                            <Clock size={11} />{step.timeframe}
                          </span>
                        </div>
                        {done && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Completed</span>}
                      </div>

                      {/* Salary range */}
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                        <DollarSign size={12} className="text-accent" />
                        {step.salaryRange.range} <span className="text-slate-400">·</span> {step.salaryRange.basis}
                      </div>

                      {/* Strategic reasoning */}
                      <div className="mb-4 flex gap-2.5">
                        <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-sm leading-relaxed text-slate-600">{step.strategicReasoning}</p>
                      </div>

                      {/* Certifications */}
                      {step.recommendedCertifications.length > 0 && (
                        <div>
                          <button type="button" onClick={() => toggleCerts(i)} className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-accent transition-colors">
                            <Award size={13} className="text-accent" />
                            Required Certifications ({step.recommendedCertifications.length})
                            {certsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          {certsOpen && (
                            <div className="space-y-2">
                              {step.recommendedCertifications.map((cert) => (
                                <div key={cert.name} className="rounded-lg border border-accent/20 bg-accent-soft p-3">
                                  <p className="text-xs font-semibold text-ink">{cert.name}</p>
                                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Info size={10} />Provider: <span className="text-slate-700">{cert.provider}</span></span>
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><DollarSign size={10} />Cost: <span className="text-slate-700">{cert.estimatedCost}</span></span>
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock size={10} />Duration: <span className="text-slate-700">{cert.estimatedDuration}</span></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {!certsOpen && (
                            <div className="flex flex-wrap gap-1.5">
                              {step.recommendedCertifications.map((cert) => (
                                <span key={cert.name} className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{cert.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* AI Chat */}
          <ChatPanel results={results} input={currentInput} />

          <button onClick={() => { setResults(null); setError(null); setSaved(false); setSavedId(null); setCompletedMilestones([]); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-bright transition-colors">
            <RefreshCw size={14} />Build a new roadmap
          </button>
        </div>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense>
      <RoadmapContent />
    </Suspense>
  );
}
