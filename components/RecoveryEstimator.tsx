"use client";

import { useState } from "react";
import { TrendingUp, Clock, ChevronDown, Banknote, Info } from "lucide-react";
import { track } from "@/lib/analytics";

interface EstimatorEntry {
  label: string;
  recoveryRange: string;
  timeline: string;
  note?: string;
}

const TURNOVER_BANDS: Record<string, EstimatorEntry> = {
  "₦50M – ₦200M": {
    label: "₦50M – ₦200M",
    recoveryRange: "₦800,000 – ₦8,000,000",
    timeline: "4 – 6 weeks",
  },
  "₦200M – ₦1B": {
    label: "₦200M – ₦1B",
    recoveryRange: "₦5,000,000 – ₦40,000,000",
    timeline: "6 – 10 weeks",
  },
  "₦1B – ₦5B": {
    label: "₦1B – ₦5B",
    recoveryRange: "₦25,000,000 – ₦150,000,000",
    timeline: "8 – 12 weeks",
  },
  "Above ₦5B": {
    label: "Above ₦5B",
    recoveryRange: "Custom Scoped",
    timeline: "10 – 16 weeks",
    note: "A dedicated forensic team will scope your recovery potential during the initial engagement call.",
  },
};

export default function RecoveryEstimator() {
  const [selected, setSelected] = useState<string>("");
  const result = selected ? TURNOVER_BANDS[selected] : null;
  const isCustom = result?.recoveryRange === "Custom Scoped";

  return (
    <div className="rounded-2xl border border-blue-900/20 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Recovery Estimator</h3>
            <p className="text-xs text-blue-300">Based on CBN audit benchmarks and historical recovery data</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Select */}
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
          Annual Turnover Band
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Select the band that best reflects your organisation's annual turnover.
        </p>
        <div className="relative">
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              if (e.target.value) track("estimator_complete", { band: e.target.value });
            }}
            className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-800 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
          >
            <option value="">— Select turnover band —</option>
            {Object.keys(TURNOVER_BANDS).map((band) => (
              <option key={band} value={band}>{band}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Result */}
        {result && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 transition-all">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Estimated Recovery Potential
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Banknote size={13} className="text-emerald-600" />
                  Typical Recovery Range
                </div>
                {isCustom ? (
                  <p className="text-lg font-bold text-blue-900">Custom Scoped</p>
                ) : (
                  <p className="text-lg font-bold text-emerald-700">{result.recoveryRange}</p>
                )}
              </div>

              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock size={13} className="text-emerald-600" />
                  Estimated Timeline
                </div>
                <p className="text-lg font-bold text-blue-900">{result.timeline}</p>
              </div>
            </div>

            {result.note && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <Info size={14} className="mt-0.5 shrink-0 text-blue-600" />
                <p className="text-xs text-blue-700">{result.note}</p>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500 border border-slate-200">
              <span className="font-semibold text-slate-700">Our fee: </span>
              30% of recovered amount only. <span className="font-semibold text-emerald-700">No recovery = No fee.</span> All estimates are indicative and subject to forensic review.
            </div>
          </div>
        )}

        {!selected && (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
            <TrendingUp size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">Select a turnover band to see your estimated recovery potential.</p>
          </div>
        )}
      </div>
    </div>
  );
}
