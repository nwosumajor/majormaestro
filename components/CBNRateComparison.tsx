"use client";

import { useState } from "react";
import { Scale, ChevronDown, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface ChargeType {
  label: string;
  cbmApproved: string;
  unit: string;
  inputPlaceholder: string;
  category: "rate" | "flat" | "info";
  cbmValue?: number;
  inputSuffix?: string;
}

const CHARGE_TYPES: ChargeType[] = [
  {
    label: "COT (Commission on Turnover)",
    cbmApproved: "₦1 per mille (0.1% max)",
    unit: "% per debit transaction",
    inputPlaceholder: "e.g. 0.35",
    category: "rate",
    cbmValue: 0.1,
    inputSuffix: "%",
  },
  {
    label: "Overdraft / Loan Interest Rate",
    cbmApproved: "MPR + 7% max (≈ 34.5% p.a. at current MPR)",
    unit: "% per annum",
    inputPlaceholder: "e.g. 38",
    category: "rate",
    cbmValue: 34.5,
    inputSuffix: "% p.a.",
  },
  {
    label: "Credit Risk Premium",
    cbmApproved: "2% per annum max",
    unit: "% per annum (on top of base rate)",
    inputPlaceholder: "e.g. 3.5",
    category: "rate",
    cbmValue: 2,
    inputSuffix: "% p.a.",
  },
  {
    label: "LC Confirmation Charge",
    cbmApproved: "0.5% – 1.5% per quarter of LC value",
    unit: "% of LC value per quarter",
    inputPlaceholder: "e.g. 2.5",
    category: "rate",
    cbmValue: 1.5,
    inputSuffix: "%",
  },
  {
    label: "SWIFT Transfer Fee",
    cbmApproved: "$25 USD flat max per transaction",
    unit: "USD per transaction",
    inputPlaceholder: "e.g. 60",
    category: "flat",
    cbmValue: 25,
    inputSuffix: "USD",
  },
  {
    label: "Annual Facility Review Fee",
    cbmApproved: "₦10,000 max per facility",
    unit: "₦ per facility per annum",
    inputPlaceholder: "e.g. 150000",
    category: "flat",
    cbmValue: 10000,
    inputSuffix: "₦",
  },
  {
    label: "Account Maintenance (Current)",
    cbmApproved: "₦1 per mille per quarter max",
    unit: "% per quarter",
    inputPlaceholder: "e.g. 0.5",
    category: "rate",
    cbmValue: 0.1,
    inputSuffix: "%",
  },
];

export default function CBNRateComparison() {
  const [selected, setSelected] = useState<string>("");
  const [charged, setCharged] = useState<string>("");

  const charge = CHARGE_TYPES.find((c) => c.label === selected);
  const chargedNum = parseFloat(charged);
  const isOvercharged = charge && !isNaN(chargedNum) && charge.cbmValue !== undefined && chargedNum > charge.cbmValue;
  const isCompliant = charge && !isNaN(chargedNum) && charge.cbmValue !== undefined && chargedNum <= charge.cbmValue;
  const excessPct = charge && charge.cbmValue && isOvercharged ? ((chargedNum - charge.cbmValue) / charge.cbmValue * 100).toFixed(0) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-blue-950 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">CBN Rate Compliance Checker</h3>
            <p className="text-xs text-blue-300">Instantly compare your bank&apos;s charges against CBN-approved ceilings</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Charge type selector */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Select Charge Type</label>
          <div className="relative">
            <select
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setCharged(""); }}
              className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-800 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
            >
              <option value="">— Select a charge type —</option>
              {CHARGE_TYPES.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* CBN approved display */}
        {charge && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-2.5">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-blue-800">CBN Approved Maximum</p>
              <p className="text-sm font-bold text-blue-900 mt-0.5">{charge.cbmApproved}</p>
            </div>
          </div>
        )}

        {/* What your bank charges */}
        {charge && (
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
        {charge && !isNaN(chargedNum) && chargedNum > 0 && (
          <div className={`rounded-xl border-2 p-5 ${isOvercharged ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
            {isOvercharged ? (
              <div>
                <div className="mb-3 flex items-center gap-2.5">
                  <AlertTriangle size={22} className="text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Potential Overcharge Detected</p>
                    <p className="text-xs text-red-600">This rate exceeds the CBN-approved maximum</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-white/70 p-3 border border-red-200">
                    <p className="text-xs font-semibold text-slate-500">Your rate</p>
                    <p className="text-base font-black text-red-700">{chargedNum}{charge.inputSuffix}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-3 border border-emerald-200">
                    <p className="text-xs font-semibold text-slate-500">CBN max</p>
                    <p className="text-base font-black text-emerald-700">{charge.cbmValue}{charge.inputSuffix}</p>
                  </div>
                  <div className="rounded-lg bg-red-600 p-3">
                    <p className="text-xs font-semibold text-red-200">Excess</p>
                    <p className="text-base font-black text-white">{excessPct}% over</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-red-700 font-medium">
                  This excess is recoverable up to 6 years retrospectively under BOFIA Act 2020. Run a full forensic audit to quantify the exact amount.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Within CBN Approved Limits</p>
                  <p className="text-xs text-emerald-700 mt-0.5">This specific charge appears compliant. However, overcharges often occur across multiple charge types simultaneously. A full forensic audit examines all charge categories and all transaction periods.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!selected && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
            <Scale size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">Select a charge type to check if your bank is compliant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
