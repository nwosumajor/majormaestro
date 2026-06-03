"use client";

import { useEffect, useState } from "react";
import { Banknote, Brain, ListChecks, Scale } from "lucide-react";
import RecoveryEstimator from "@/components/RecoveryEstimator";
import AIPreScreener from "@/components/AIPreScreener";
import PreQualQuiz from "@/components/PreQualQuiz";
import CBNRateComparison from "@/components/CBNRateComparison";
import { cn } from "@/lib/cn";

const TABS = [
  {
    key: "estimator",
    label: "Estimate Recovery",
    icon: Banknote,
    eyebrow: "Interactive Tool",
    title: "How much could you recover?",
    lede: "Select your annual turnover band to see your estimated recovery potential, based on historical audit outcomes against CBN benchmarks.",
    node: <RecoveryEstimator />,
  },
  {
    key: "prescreener",
    label: "AI Pre-Screen",
    icon: Brain,
    eyebrow: "AI-Powered Tool",
    title: "AI pre-screening analysis",
    lede: "Describe your banking situation in plain language. Our AI analyses your inputs against CBN charge ceilings and gives you an instant preliminary assessment.",
    node: <AIPreScreener />,
  },
  {
    key: "quiz",
    label: "Eligibility Quiz",
    icon: ListChecks,
    eyebrow: "5-Minute Quiz",
    title: "Check your eligibility",
    lede: "Five quick questions. Instant score. Find out whether your company profile matches the profile of our highest-yield recovery cases.",
    node: <PreQualQuiz />,
  },
  {
    key: "cbn-checker",
    label: "CBN Rate Checker",
    icon: Scale,
    eyebrow: "Compliance Tool",
    title: "CBN rate compliance checker",
    lede: "Know the specific rate your bank is charging you? Enter it here and we'll instantly tell you whether it exceeds the CBN approved ceiling.",
    node: <CBNRateComparison />,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function RecoveryTools() {
  const [active, setActive] = useState<TabKey>("estimator");

  // Keep the legacy QUICK_NAV anchors (#estimator, #prescreener, #quiz,
  // #cbn-checker) working: jumping to one selects the matching tab.
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (TABS.some((t) => t.key === hash)) setActive(hash as TabKey);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const current = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <section id="tools" className="border-b border-slate-200 bg-white py-16 sm:py-24">
      {/* invisible scroll anchors so sticky-nav links land at the section top */}
      {TABS.map((t) => (
        <span key={t.key} id={t.key} className="block -translate-y-32" aria-hidden />
      ))}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Tab bar */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActive(key);
                  history.replaceState(null, "", `#${key}`);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                  isActive
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-ink/30 hover:text-ink"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Active tool heading */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">{current.eyebrow}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {current.title}
          </h2>
          <p className="mt-3 text-base text-slate-600">{current.lede}</p>
        </div>

        {/* Active tool — render all, toggle visibility so state persists between tabs */}
        {TABS.map((t) => (
          <div key={t.key} className={t.key === active ? "block" : "hidden"}>
            {t.node}
          </div>
        ))}
      </div>
    </section>
  );
}
