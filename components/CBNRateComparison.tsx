"use client";

import { useState } from "react";
import { Scale, ChevronDown, AlertTriangle, CheckCircle2, Info, History } from "lucide-react";
import { CBN_CHARGES, getCharge, CBN_GUIDE_LABEL } from "@/lib/cbnCharges";

export default function CBNRateComparison() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [charged, setCharged] = useState<string>("");
  const [agreed, setAgreed] = useState<string>(""); // for negotiable (interest)

  const charge = selectedId ? getCharge(selectedId) : undefined;
  const chargedNum = parseFloat(charged);
  const agreedNum = parseFloat(agreed);

  const isNegotiable = charge?.kind === "negotiable";
  const isHistorical = charge?.kind === "historical";
  const hasNumericCeiling = charge?.ceilingValue !== undefined && !isNegotiable && !isHistorical;

  // Result for a fixed-ceiling charge
  const overByCeiling = hasNumericCeiling && !isNaN(chargedNum) && chargedNum > (charge!.ceilingValue as number);
  // Result for a negotiable charge: charged above the agreed/contractual rate
  const overByAgreed = isNegotiable && !isNaN(chargedNum) && !isNaN(agreedNum) && chargedNum > agreedNum;

  const showResult =
    (hasNumericCeiling && !isNaN(chargedNum) && chargedNum > 0) ||
    (isNegotiable && !isNaN(chargedNum) && chargedNum > 0 && !isNaN(agreedNum) && agreedNum > 0);
  const isOvercharged = overByCeiling || overByAgreed;

  const ceiling = charge?.ceilingValue;
  const excessPct =
    overByCeiling && ceiling ? (((chargedNum - ceiling) / ceiling) * 100).toFixed(0) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-blue-950 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">CBN Rate Compliance Checker</h3>
            <p className="text-xs text-blue-300">
              Benchmarked against the {CBN_GUIDE_LABEL}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Charge type selector */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Select Charge Type</label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setCharged("");
                setAgreed("");
              }}
              className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-800 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
            >
              <option value="">— Select a charge type —</option>
              {CBN_CHARGES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* CBN rule display */}
        {charge && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Info size={15} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-blue-800">
                  CBN rule <span className="font-normal text-blue-600">· {charge.section}</span>
                </p>
                <p className="text-sm font-bold text-blue-900 mt-0.5">{charge.ceiling}</p>
                <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">{charge.basis}</p>
                {charge.notes && <p className="text-xs text-blue-700/80 mt-1.5 italic leading-relaxed">{charge.notes}</p>}
              </div>
            </div>
            {charge.draft2026 && (
              <p className="mt-2 border-t border-blue-100 pt-2 text-[11px] text-slate-500">
                <span className="font-semibold">Heads-up (2026 Draft — not yet in force):</span> {charge.draft2026}
              </p>
            )}
          </div>
        )}

        {/* Historical charge (COT) — no live numeric check */}
        {charge && isHistorical && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <History size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-900">Historical charge — not in the current Guide</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  This charge no longer exists under the 2020 Guide, so there is no current ceiling to check. It is
                  recoverable <strong>only for the historical periods when it actually applied</strong> (pre-2016). For a
                  current account-turnover charge, check <strong>CAMF</strong> instead. A forensic audit identifies the
                  exact periods and amounts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Negotiable charge (interest): compare charged vs agreed/contractual */}
        {charge && isNegotiable && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Rate in your offer/facility letter</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={agreed}
                  onChange={(e) => setAgreed(e.target.value)}
                  placeholder="e.g. 26"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">% p.a.</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Rate actually charged</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={charged}
                  onChange={(e) => setCharged(e.target.value)}
                  placeholder="e.g. 32"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">% p.a.</span>
              </div>
            </div>
          </div>
        )}

        {/* Fixed-ceiling charge: single input */}
        {charge && hasNumericCeiling && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
              What does your bank charge? ({charge.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={charged}
                onChange={(e) => setCharged(e.target.value)}
                placeholder={charge.inputPlaceholder}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-16 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">{charge.inputSuffix}</span>
            </div>
          </div>
        )}

        {/* Result */}
        {showResult && (
          <div className={`rounded-xl border-2 p-5 ${isOvercharged ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
            {isOvercharged ? (
              <div>
                <div className="mb-3 flex items-center gap-2.5">
                  <AlertTriangle size={22} className="text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Potential Overcharge Detected</p>
                    <p className="text-xs text-red-600">
                      {overByAgreed ? "This exceeds the rate in your facility letter" : "This exceeds the CBN-approved maximum"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-white/70 p-3 border border-red-200">
                    <p className="text-xs font-semibold text-slate-500">Your rate</p>
                    <p className="text-base font-black text-red-700">{chargedNum}{charge?.inputSuffix ?? "%"}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-3 border border-emerald-200">
                    <p className="text-xs font-semibold text-slate-500">{overByAgreed ? "Agreed" : "CBN max"}</p>
                    <p className="text-base font-black text-emerald-700">{overByAgreed ? agreedNum : ceiling}{charge?.inputSuffix ?? "%"}</p>
                  </div>
                  <div className="rounded-lg bg-red-600 p-3">
                    <p className="text-xs font-semibold text-red-200">Excess</p>
                    <p className="text-base font-black text-white">{overByAgreed ? `+${(chargedNum - agreedNum).toFixed(2)}pp` : `${excessPct}% over`}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-red-700 font-medium">
                  Recoverable up to 6 years retrospectively under BOFIA Act 2020. A full forensic audit quantifies the exact amount across all transactions and periods.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Within {overByAgreed === false && isNegotiable ? "your agreed rate" : "CBN-approved limits"}</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    This specific charge appears compliant. Overcharges often occur across multiple charge types and periods simultaneously — a full forensic audit examines every category and the full transaction history.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedId && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
            <Scale size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">Select a charge type to check it against the CBN Guide.</p>
          </div>
        )}

        <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
          Indicative only, based on the {CBN_GUIDE_LABEL}. Not legal advice. A forensic audit against your statements and
          facility letters is definitive.
        </p>
      </div>
    </div>
  );
}
