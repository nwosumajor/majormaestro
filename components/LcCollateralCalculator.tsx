"use client";

import { useMemo, useState } from "react";
import { Coins, ArrowRight, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { CURRENT_MPR, lcCollateralMinRate, lcCollateralInterestOwed } from "@/lib/cbnCharges";
import { track } from "@/lib/analytics";

const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const num = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function LcCollateralCalculator() {
  const [cover, setCover] = useState("");
  const [months, setMonths] = useState("");
  const [mpr, setMpr] = useState(String(CURRENT_MPR));

  const coverN = num(cover);
  const monthsN = num(months);
  const mprN = num(mpr) || CURRENT_MPR;

  const rate = lcCollateralMinRate(mprN);
  const owed = useMemo(() => lcCollateralInterestOwed(coverN, monthsN, mprN), [coverN, monthsN, mprN]);
  const show = owed > 0;

  // Email capture
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function requestGuide(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/recovery/lc-interest-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          companyName: company || undefined,
          coverNaira: coverN || undefined,
          months: monthsN || undefined,
          mpr: mprN || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setState("done");
      setMsg(data.message || "Your guide is on its way.");
      track("lead_magnet_submit", { label: "lc_interest_guide" });
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="bg-emerald-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white">
            <Coins size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">What is your bank holding from you?</h3>
            <p className="text-xs text-emerald-100">Estimate the interest owed on your LC cash-collateral</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Total cash cover lodged for LCs</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₦</span>
              <input
                inputMode="numeric"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                onBlur={() => { if (owed > 0) track("estimator_complete", { label: "lc_collateral_calc" }); }}
                placeholder="50,000,000"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pl-8 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Months held</label>
            <input
              inputMode="numeric"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              placeholder="18"
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Current MPR (%)</label>
            <input
              inputMode="decimal"
              value={mpr}
              onChange={(e) => setMpr(e.target.value)}
              placeholder={String(CURRENT_MPR)}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
            />
          </div>
        </div>

        {show ? (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Minimum interest you are owed</p>
            <p className="mt-1 font-figure text-4xl font-black text-emerald-700">{naira(owed)}</p>
            <p className="mt-2 text-xs text-emerald-800">
              at <strong>{rate}% p.a.</strong> — the 30%-of-MPR floor for special-purpose deposits. Recoverable up to 6 years back; a forensic audit confirms the exact figure across every LC.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-7 text-center">
            <Coins size={26} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">Enter your cover amount and months held to see what you&apos;re owed.</p>
          </div>
        )}

        {/* Email opt-in (lead magnet) */}
        {state === "done" ? (
          <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">{msg}</p>
          </div>
        ) : (
          <form onSubmit={requestGuide} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Email me the step-by-step guide to claiming this</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              />
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name (optional)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition"
              />
            </div>
            {state === "error" && <p className="text-xs font-medium text-red-600">{msg}</p>}
            <button
              type="submit"
              disabled={state === "loading"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors sm:w-auto"
            >
              {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              Send me the guide
            </button>
          </form>
        )}

        <a
          href="/recovery#intake"
          onClick={() => track("cta_click", { label: "lc_calc_lodge" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
        >
          Claim what you&apos;re owed — lodge a complaint <ArrowRight size={15} />
        </a>

        <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
          Indicative estimate of the minimum entitlement (30% of MPR on cash cover held as a special-purpose deposit; cover funded by a bank loan is excluded). Not legal advice — a forensic audit against your statements and LC documents is definitive.
        </p>
      </div>
    </div>
  );
}
