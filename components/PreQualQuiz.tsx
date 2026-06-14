"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/analytics";

interface Option { label: string; points: number; detail?: string }
interface Question { id: number; text: string; options: Option[]; multi?: boolean }

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "How long has your company maintained corporate bank accounts?",
    options: [
      { label: "Less than 2 years", points: 0 },
      { label: "2 – 5 years", points: 1, detail: "Partial recovery window available" },
      { label: "More than 5 years", points: 2, detail: "Full 6-year retrospective window" },
    ],
  },
  {
    id: 2,
    text: "Which banking products does your company currently use or has used?",
    multi: true,
    options: [
      { label: "Overdraft / credit facility", points: 1 },
      { label: "Term loan or project finance", points: 1 },
      { label: "Letters of Credit (LC)", points: 1 },
      { label: "Trade / import finance lines", points: 1 },
      { label: "Treasury or FX services", points: 1 },
    ],
  },
  {
    id: 3,
    text: "What is your company's approximate annual turnover?",
    options: [
      { label: "Below ₦50M", points: 0 },
      { label: "₦50M – ₦500M", points: 1, detail: "Solid recovery potential" },
      { label: "₦500M – ₦2B", points: 2, detail: "High recovery potential" },
      { label: "Above ₦2B", points: 3, detail: "Very high recovery potential" },
    ],
  },
  {
    id: 4,
    text: "Have you ever queried bank charges with your relationship manager?",
    options: [
      { label: "Never queried bank charges", points: 1, detail: "Charges likely unchallenged for years" },
      { label: "Yes — bank reversed the charges", points: 2, detail: "Clear precedent of overcharging" },
      { label: "Yes — bank refused to reverse", points: 3, detail: "Escalation route available via CBN" },
      { label: "We don't review charges regularly", points: 2, detail: "Likely years of unchecked overcharging" },
    ],
  },
  {
    id: 5,
    text: "Do you have access to bank statements for the last 3+ years?",
    options: [
      { label: "No, we don't retain old statements", points: 0 },
      { label: "Partial — 1 to 2 years", points: 1 },
      { label: "Yes — 3 to 5 years of statements", points: 2 },
      { label: "Yes — 5+ years of statements", points: 3, detail: "Maximum recovery window" },
    ],
  },
];

// Max possible score across all questions
const MAX_SCORE = QUESTIONS.reduce((acc, q) => {
  if (q.multi) return acc + q.options.reduce((s, o) => s + o.points, 0);
  return acc + Math.max(...q.options.map((o) => o.points));
}, 0);

function getResult(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 55) return {
    pct,
    label: "High Recovery Potential",
    color: "text-red-700",
    barColor: "bg-red-500",
    border: "border-red-300 bg-red-50",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    message: "Your profile closely matches our highest-yield recovery cases. A forensic audit is very likely to surface significant excess charges recoverable under CBN and BOFIA regulations.",
    btnClass: "bg-red-600 hover:bg-red-700",
    cta: "Lodge a Complaint Now",
    href: "#intake",
  };
  if (pct >= 30) return {
    pct,
    label: "Moderate Recovery Potential",
    color: "text-amber-700",
    barColor: "bg-amber-500",
    border: "border-amber-300 bg-amber-50",
    icon: TrendingUp,
    iconColor: "text-amber-600",
    message: "Your profile shows meaningful indicators of potential overcharging. A forensic audit is likely to surface at least some excess charges. The actual figure depends on the specific charge types applied by your bank.",
    btnClass: "bg-amber-600 hover:bg-amber-700",
    cta: "Run AI Pre-Screening",
    href: "#prescreener",
  };
  return {
    pct,
    label: "Lower Immediate Exposure",
    color: "text-emerald-700",
    barColor: "bg-emerald-500",
    border: "border-emerald-300 bg-emerald-50",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    message: "Based on these answers, your immediate recovery opportunity appears more limited — typically due to shorter banking history or lower transaction volumes. Only a full forensic audit can confirm this with certainty.",
    btnClass: "bg-accent hover:bg-accent-bright",
    cta: "Speak to a Specialist",
    href: "#intake",
  };
}

export default function PreQualQuiz() {
  // answers: { [questionId]: Set of selected option indices }
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[step];

  function toggle(qId: number, optIdx: number, multi: boolean) {
    setAnswers((prev) => {
      const curr = new Set(prev[qId] ?? []);
      if (multi) {
        curr.has(optIdx) ? curr.delete(optIdx) : curr.add(optIdx);
      } else {
        curr.clear();
        curr.add(optIdx);
      }
      return { ...prev, [qId]: curr };
    });
  }

  function isSelected(qId: number, optIdx: number) {
    return answers[qId]?.has(optIdx) ?? false;
  }

  const canProceed = (answers[q.id]?.size ?? 0) > 0;

  function totalScore() {
    return QUESTIONS.reduce((total, question) => {
      const sel = answers[question.id];
      if (!sel) return total;
      return total + [...sel].reduce((s, idx) => s + (question.options[idx]?.points ?? 0), 0);
    }, 0);
  }

  function next() {
    if (step < QUESTIONS.length - 1) setStep((s) => s + 1);
    else {
      const score = totalScore();
      track("quiz_complete", { score, max: MAX_SCORE, tier: getResult(score, MAX_SCORE).label });
      setDone(true);
    }
  }

  function reset() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  if (done) {
    const score = totalScore();
    const result = getResult(score, MAX_SCORE);
    const Icon = result.icon;
    return (
      <div className={`rounded-2xl border-2 p-8 ${result.border}`}>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Icon size={28} className={result.iconColor} />
          </div>
          <div>
            <p className={`text-xl font-black ${result.color}`}>{result.label}</p>
            <p className="text-sm text-slate-500">Eligibility score: {score} / {MAX_SCORE}</p>
          </div>
        </div>

        <div className="mb-5 h-3 w-full rounded-full bg-white/60 border border-white/80 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${result.barColor}`} style={{ width: `${result.pct}%` }} />
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-700">{result.message}</p>

        <div className="flex flex-wrap gap-3">
          <Link href={result.href} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors ${result.btnClass}`}>
            {result.cta} <ArrowRight size={15} />
          </Link>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="h-1.5 bg-slate-100">
        <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
      </div>
      <div className="p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-accent">Question {step + 1} of {QUESTIONS.length}</span>
          {q.multi && <span className="text-xs text-slate-400">Select all that apply</span>}
        </div>

        <p className="mb-5 text-base font-bold leading-snug text-slate-900">{q.text}</p>

        <div className="space-y-2.5">
          {q.options.map((opt, idx) => {
            const sel = isSelected(q.id, idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggle(q.id, idx, !!q.multi)}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${sel ? "border-accent bg-accent-soft" : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm font-medium ${sel ? "text-ink" : "text-slate-700"}`}>{opt.label}</span>
                  {sel && <CheckCircle2 size={16} className="shrink-0 text-accent" />}
                </div>
                {opt.detail && <p className="mt-0.5 text-xs text-slate-500">{opt.detail}</p>}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} />Back
            </button>
          ) : <div />}
          <button type="button" onClick={next} disabled={!canProceed} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-bright disabled:opacity-50 transition-colors">
            {step === QUESTIONS.length - 1 ? "See My Result" : "Next"}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
