"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Trophy,
  ChevronRight,
  Brain,
  Zap,
  Globe,
  Leaf,
  Award,
  Upload,
  FileText,
  Save,
  Copy,
  Download,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Classification, AssessmentInput } from "@/types";
import { saveClassificationSmart } from "@/lib/clientStorage";

const RANK_STYLES: Record<number, { border: string; badge: string; label: string; bar: string }> = {
  1: { border: "border-amber-300 bg-amber-50", badge: "bg-amber-500 text-white", label: "Best Fit", bar: "bg-amber-500" },
  2: { border: "border-slate-300 bg-slate-50", badge: "bg-slate-500 text-white", label: "Strong Fit", bar: "bg-slate-500" },
  3: { border: "border-orange-200 bg-orange-50", badge: "bg-orange-400 text-white", label: "Good Fit", bar: "bg-orange-400" },
};

const ATTRIBUTE_FIELDS = [
  { key: "psychological" as const, label: "Psychological Attributes", icon: Brain, placeholder: "e.g. Highly analytical, introverted, strong attention to detail, perfectionist tendencies, risk-averse…", hint: "Personality traits, cognitive style, temperament, motivations" },
  { key: "mental" as const, label: "Mental Attributes", icon: Zap, placeholder: "e.g. Strong quantitative reasoning, fast learner, excellent problem-solver, creative thinker…", hint: "Intellectual strengths, learning style, analytical ability" },
  { key: "social" as const, label: "Social Attributes", icon: Globe, placeholder: "e.g. Excellent communicator, natural leader, collaborative team player, strong negotiator…", hint: "Interpersonal skills, communication style, leadership tendency" },
  { key: "environmental" as const, label: "Environmental Attributes", icon: Leaf, placeholder: "e.g. Thrives under pressure, prefers structured environments, adaptable to remote work…", hint: "Work environment preferences, stress tolerance, adaptability" },
] as const;

type AttributeKey = "psychological" | "mental" | "social" | "environmental";

interface ChatMessage { role: "user" | "assistant"; content: string; }

function ChatPanel({ results, input }: { results: Classification[]; input: AssessmentInput }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const context = { type: "classification", results, input };

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
    <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
        <span className="flex items-center gap-2"><MessageSquare size={16} /> Ask AI a follow-up question about your results</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="border-t border-indigo-200 bg-white">
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-xs text-slate-400 text-center pt-8">Ask anything about your classification results…</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>{m.content}</div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && <div className="flex justify-start"><div className="rounded-xl bg-slate-100 px-4 py-2.5"><Loader2 size={14} className="animate-spin text-slate-400" /></div></div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-slate-200 p-3">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="e.g. Why did I score low on Risk Management?" className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
            <button type="submit" disabled={isLoading || !chatInput.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"><Send size={15} /></button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  const [attributes, setAttributes] = useState<Record<AttributeKey, string>>({ psychological: "", mental: "", social: "", environmental: "" });
  const [certificates, setCertificates] = useState<string[]>([""]);
  const [assessmentName, setAssessmentName] = useState("");
  const [results, setResults] = useState<Classification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvBanner, setCvBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showCVUpload, setShowCVUpload] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateAttribute(key: AttributeKey, value: string) {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  }

  function addCertificate() { setCertificates((p) => [...p, ""]); }
  function updateCertificate(i: number, v: string) { setCertificates((p) => p.map((c, j) => (j === i ? v : c))); }
  function removeCertificate(i: number) { setCertificates((p) => p.filter((_, j) => j !== i)); }

  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvLoading(true);
    setCvBanner(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-cv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttributes({ psychological: data.psychological, mental: data.mental, social: data.social, environmental: data.environmental });
      setCertificates(data.certificates.length > 0 ? data.certificates : [""]);
      setCvBanner(`Fields pre-filled from "${file.name}". Please review and edit before submitting.`);
      setShowCVUpload(false);
    } catch (err) {
      setCvBanner(err instanceof Error ? err.message : "CV parsing failed.");
    } finally {
      setCvLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setSaved(false);
    setLoading(true);
    try {
      const cleanedCerts = certificates.filter((c) => c.trim().length > 0);
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attributes, certificates: cleanedCerts }),
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

  async function handleSave() {
    if (!results) return;
    const cleanedCerts = certificates.filter((c) => c.trim().length > 0);
    await saveClassificationSmart({
      label: assessmentName.trim() || `Assessment – ${results[0].departmentName}`,
      input: { ...attributes, certificates: cleanedCerts },
      results,
    });
    setSaved(true);
  }

  async function handleCopy() {
    if (!results) return;
    const text = results.map((r) =>
      `#${r.rank} ${r.departmentName} (${r.industryCategory}) — ${r.confidenceScore}% confidence\n${r.reasoning}\nSkill Gaps: ${r.skillGaps.join(", ")}`
    ).join("\n\n");
    await navigator.clipboard.writeText(text);
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
      pdf.save(`classification-${Date.now()}.pdf`);
    } finally {
      setExportLoading(false);
    }
  }

  const isFormValid = Object.values(attributes).every((v) => v.trim().length > 0);
  const currentInput: AssessmentInput = { ...attributes, certificates: certificates.filter(Boolean) };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Users size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff Classification</h1>
        <p className="mt-2 text-base text-slate-600">Complete the four attribute sections and list certifications. The AI returns the top 3 best-fit departments with confidence scores and skill gaps.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assessment name */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Assessment Label <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={assessmentName}
            onChange={(e) => setAssessmentName(e.target.value)}
            placeholder="e.g. John Doe – Q2 Placement Review"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
          />
        </div>

        {/* CV Upload */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button type="button" onClick={() => setShowCVUpload((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <span className="flex items-center gap-2"><Upload size={16} className="text-indigo-600" /> Auto-fill from CV / Resume (PDF)</span>
            {showCVUpload ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showCVUpload && (
            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
              <p className="mb-3 text-sm text-slate-500">Upload a PDF CV and the AI will analyse it and pre-fill the fields below. Review and edit before submitting.</p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 px-6 py-8 text-center hover:bg-indigo-100 transition-colors">
                {cvLoading ? (
                  <><Loader2 size={24} className="animate-spin text-indigo-500" /><span className="text-sm text-indigo-600">Analysing CV…</span></>
                ) : (
                  <><FileText size={24} className="text-indigo-400" /><span className="text-sm font-medium text-indigo-700">Click to select PDF</span><span className="text-xs text-slate-500">Supports standard CV/resume PDFs up to 10MB</span></>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleCVUpload} disabled={cvLoading} />
              </label>
            </div>
          )}
        </div>

        {/* CV banner */}
        {cvBanner && (
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cvBanner.includes("pre-filled") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {cvBanner.includes("pre-filled") ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {cvBanner}
          </div>
        )}

        {/* Attribute fields */}
        {ATTRIBUTE_FIELDS.map(({ key, label, icon: Icon, placeholder, hint }) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Icon size={16} className="text-indigo-600" />{label}
            </label>
            <p className="mb-3 text-xs text-slate-500">{hint}</p>
            <textarea rows={3} value={attributes[key]} onChange={(e) => updateAttribute(key, e.target.value)} placeholder={placeholder} required className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
          </div>
        ))}

        {/* Certificates */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Award size={16} className="text-indigo-600" />Certificates Acquired
          </label>
          <p className="mb-4 text-xs text-slate-500">List each certification separately. Leave blank if none.</p>
          <div className="space-y-2">
            {certificates.map((cert, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={cert} onChange={(e) => updateCertificate(i, e.target.value)} placeholder="e.g. AWS Solutions Architect, CFA, PMP…" className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
                {certificates.length > 1 && (
                  <button type="button" onClick={() => removeCertificate(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addCertificate} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            <Plus size={14} />Add another certificate
          </button>
        </div>

        <button type="submit" disabled={loading || !isFormValid} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <><Loader2 size={16} className="animate-spin" />Analysing profile…</> : <><Trophy size={16} />Run Classification<ChevronRight size={16} /></>}
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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Classification Results</h2>
            {/* Action bar */}
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSave} disabled={saved} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${saved ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-700"}`}>
                {saved ? <><CheckCircle2 size={13} />Saved</> : <><Save size={13} />Save</>}
              </button>
              <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition-colors">
                {copied ? <><CheckCircle2 size={13} />Copied!</> : <><Copy size={13} />Copy Summary</>}
              </button>
              <button onClick={handleExport} disabled={exportLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition-colors disabled:opacity-60">
                {exportLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}Export PDF
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {results.map((item) => {
              const style = RANK_STYLES[item.rank] ?? RANK_STYLES[3];
              return (
                <div key={item.rank} className={`rounded-xl border-2 p-6 ${style.border}`}>
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}>{item.rank}</span>
                      <div>
                        <p className="text-base font-bold text-slate-900">{item.departmentName}</p>
                        <p className="text-xs text-slate-500">{item.industryCategory}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>{style.label}</span>
                  </div>

                  {/* Confidence bar */}
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Confidence Score</span>
                      <span className="font-bold text-slate-800">{item.confidenceScore}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/60 border border-slate-200">
                      <div className={`h-full rounded-full ${style.bar} transition-all duration-700`} style={{ width: `${item.confidenceScore}%` }} />
                    </div>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-slate-700">{item.reasoning}</p>

                  {/* Skill gaps */}
                  {item.skillGaps.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <XCircle size={13} className="text-red-400" />Skill Gaps to Address
                      </p>
                      <ul className="space-y-1">
                        {item.skillGaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />{gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bridge to Roadmap */}
          <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <p className="mb-1 text-sm font-semibold text-indigo-900">Ready to plan your path to {results[0].departmentName}?</p>
            <p className="mb-4 text-xs text-slate-600">Build a milestone-driven career roadmap based on your top classification result.</p>
            <Link
              href={`/roadmap?currentRole=${encodeURIComponent(assessmentName || "Current Role")}&targetRole=${encodeURIComponent(results[0].departmentName)}&fromBridge=true`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <TrendingUp size={15} />Build Roadmap for {results[0].departmentName}<ChevronRight size={14} />
            </Link>
          </div>

          {/* AI Chat */}
          <ChatPanel results={results} input={currentInput} />

          <button onClick={() => { setResults(null); setError(null); setSaved(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            <Plus size={14} className="rotate-45" />Start a new assessment
          </button>
        </div>
      )}
    </div>
  );
}
