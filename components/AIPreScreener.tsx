"use client";

import { useState } from "react";
import { Brain, ChevronDown, Loader2, AlertTriangle, TrendingUp, CheckCircle2, ArrowRight, Zap, Shield, FileSearch } from "lucide-react";

const TURNOVER_BANDS = [
  "Below ₦50M",
  "₦50M – ₦500M",
  "₦500M – ₦2B",
  "₦2B – ₦5B",
  "Above ₦5B",
];

interface PreScreenResult {
  riskLevel: "High" | "Medium" | "Low" | "Insufficient";
  complianceStatus: string;
  keyFindings: string[];
  chargesAtRisk: string[];
  estimatedRecoveryHint: string;
  recommendation: string;
  urgencyNote: string;
}

const RISK_CONFIG = {
  High: {
    badge: "bg-red-100 text-red-700 border-red-200",
    border: "border-red-300 bg-red-50",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    bar: "bg-red-500",
    barWidth: "90%",
    label: "High Recovery Potential",
  },
  Medium: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    border: "border-amber-300 bg-amber-50",
    icon: TrendingUp,
    iconColor: "text-amber-600",
    bar: "bg-amber-500",
    barWidth: "55%",
    label: "Moderate Recovery Potential",
  },
  Low: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    border: "border-emerald-300 bg-emerald-50",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    bar: "bg-emerald-500",
    barWidth: "20%",
    label: "Lower Immediate Exposure",
  },
  Insufficient: {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    border: "border-slate-200 bg-slate-50",
    icon: FileSearch,
    iconColor: "text-slate-500",
    bar: "bg-slate-400",
    barWidth: "10%",
    label: "More Information Needed",
  },
};

export default function AIPreScreener() {
  const [description, setDescription] = useState("");
  const [bankName, setBankName] = useState("");
  const [turnoverBand, setTurnoverBand] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreScreenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/pre-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, bankName: bankName || undefined, turnoverBand: turnoverBand || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pre-screen failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const cfg = result ? RISK_CONFIG[result.riskLevel] : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-blue-950 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Pre-Screening Analysis</h3>
            <p className="text-xs text-blue-300">Describe your banking situation — our AI identifies potential overcharges instantly</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
              Describe your banking situation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="e.g. We have maintained accounts with two commercial banks for the past 6 years. We use overdraft facilities and regularly process Letters of Credit for imports. We noticed our COT charges seem unusually high and our overdraft interest has been around 38% per annum. We also get charged per SWIFT transfer well above what we expected…"
              required
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition resize-none"
            />
            <p className="mt-1 text-xs text-slate-400">The more detail you provide, the more accurate the analysis. Include charge types, rates, and how long you&apos;ve banked there.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Bank Name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. First Bank, GTBank…"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Annual Turnover <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={turnoverBand}
                  onChange={(e) => setTurnoverBand(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 pr-9 text-sm text-slate-800 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
                >
                  <option value="">— Select band —</option>
                  {TURNOVER_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !description.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Analysing…</>
            ) : (
              <><Zap size={16} /> Run AI Pre-Screen</>
            )}
          </button>
        </form>

        {result && cfg && (
          <div className={`mt-6 rounded-2xl border-2 p-6 ${cfg.border}`}>
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <cfg.icon size={22} className={cfg.iconColor} />
                </div>
                <div>
                  <p className="font-black text-slate-900">{cfg.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{result.complianceStatus}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${cfg.badge}`}>
                {result.riskLevel} Risk
              </span>
            </div>

            {/* Risk bar */}
            <div className="mb-5 h-2.5 w-full rounded-full bg-white/60 border border-white/80 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: cfg.barWidth }} />
            </div>

            {/* Key Findings */}
            {result.keyFindings.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Key Findings</p>
                <ul className="space-y-1.5">
                  {result.keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <ArrowRight size={13} className="mt-0.5 shrink-0 text-slate-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Charges at risk */}
            {result.chargesAtRisk.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Charges at Risk</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.chargesAtRisk.map((c, i) => (
                    <span key={i} className="rounded-full bg-white/70 border border-white px-2.5 py-1 text-xs font-medium text-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recovery hint */}
            {result.estimatedRecoveryHint && (
              <div className="mb-4 rounded-xl border border-white/60 bg-white/50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Estimated Recovery Hint</p>
                <p className="text-sm font-semibold text-slate-800">{result.estimatedRecoveryHint}</p>
              </div>
            )}

            {/* Recommendation */}
            <div className="mb-3 rounded-xl border border-white/60 bg-white/50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Recommendation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.recommendation}</p>
            </div>

            {/* Urgency */}
            {result.urgencyNote && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs font-medium text-amber-800">{result.urgencyNote}</p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#intake"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 transition-colors shadow-sm"
              >
                Lodge a Complaint <ArrowRight size={14} />
              </a>
              <button
                type="button"
                onClick={() => { setResult(null); setDescription(""); setBankName(""); setTurnoverBand(""); }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Run Another
              </button>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
            <Shield size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-xs text-slate-400">All pre-screen submissions are confidential and protected under NDA. No data is shared with third parties.</p>
          </div>
        )}
      </div>
    </div>
  );
}
