"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Users,
  TrendingUp,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Award,
  DollarSign,
  XCircle,
} from "lucide-react";
import {
  getClassifications,
  getRoadmaps,
  deleteClassification,
  deleteRoadmap,
} from "@/lib/storage";
import type { SavedClassification, SavedRoadmap } from "@/types";

type Tab = "classifications" | "roadmaps";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ClassificationCard({ item, onDelete }: { item: SavedClassification; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{item.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDate(item.savedAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.results.slice(0, 3).map((r) => (
              <span key={r.rank} className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-700">#{r.rank} {r.departmentName}</span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          {item.results.map((r) => (
            <div key={r.rank} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">#{r.rank} {r.departmentName}</p>
                <span className="text-xs font-semibold text-indigo-600">{r.confidenceScore}%</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{r.industryCategory}</p>
              <p className="text-xs leading-relaxed text-slate-600 mb-3">{r.reasoning}</p>
              {r.skillGaps.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600"><XCircle size={11} className="text-red-400" />Skill Gaps</p>
                  <ul className="space-y-0.5">
                    {r.skillGaps.map((g, i) => <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />{g}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
          <Link href={`/roadmap?currentRole=${encodeURIComponent(item.label)}&targetRole=${encodeURIComponent(item.results[0].departmentName)}&fromBridge=true`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
            <TrendingUp size={12} />Build Roadmap for {item.results[0].departmentName}
          </Link>
        </div>
      )}
    </div>
  );
}

function RoadmapCard({ item, onDelete }: { item: SavedRoadmap; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const progress = item.results.length > 0 ? Math.round((item.completedMilestones.length / item.results.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{item.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDate(item.savedAt)}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-semibold text-violet-600">{item.completedMilestones.length}/{item.results.length} milestones</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-5 space-y-3">
          {item.results.map((step, i) => {
            const done = item.completedMilestones.includes(i);
            return (
              <div key={i} className={`rounded-lg border p-4 ${done ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className={`text-sm font-bold ${done ? "line-through text-slate-400" : "text-slate-900"}`}>{step.milestoneName}</p>
                  {done && <CheckCircle2 size={14} className="shrink-0 text-emerald-500 mt-0.5" />}
                </div>
                <p className="text-xs font-medium text-violet-600 flex items-center gap-1 mb-2"><Clock size={10} />{step.timeframe}</p>
                <p className="text-xs text-slate-600 mb-2 flex items-center gap-1"><DollarSign size={10} className="text-violet-500" />{step.salaryRange.range} · {step.salaryRange.basis}</p>
                {step.recommendedCertifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {step.recommendedCertifications.map((c) => (
                      <span key={c.name} className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-700 flex items-center gap-1">
                        <Award size={9} />{c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("classifications");
  const [classifications, setClassifications] = useState<SavedClassification[]>([]);
  const [roadmaps, setRoadmaps] = useState<SavedRoadmap[]>([]);

  useEffect(() => {
    setClassifications(getClassifications());
    setRoadmaps(getRoadmaps());
  }, []);

  function removeClassification(id: string) {
    deleteClassification(id);
    setClassifications((p) => p.filter((c) => c.id !== id));
  }

  function removeRoadmap(id: string) {
    deleteRoadmap(id);
    setRoadmaps((p) => p.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-white">
          <History size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">History</h1>
        <p className="mt-2 text-base text-slate-600">All saved classifications and roadmaps, stored on your device.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {([["classifications", Users, "Classifications"], ["roadmaps", TrendingUp, "Roadmaps"]] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <Icon size={15} />{label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {key === "classifications" ? classifications.length : roadmaps.length}
            </span>
          </button>
        ))}
      </div>

      {tab === "classifications" && (
        <div className="space-y-4">
          {classifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Users size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No saved classifications yet.</p>
              <Link href="/assessment" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800">Run your first assessment →</Link>
            </div>
          ) : (
            classifications.map((item) => <ClassificationCard key={item.id} item={item} onDelete={() => removeClassification(item.id)} />)
          )}
        </div>
      )}

      {tab === "roadmaps" && (
        <div className="space-y-4">
          {roadmaps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <TrendingUp size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No saved roadmaps yet.</p>
              <Link href="/roadmap" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800">Build your first roadmap →</Link>
            </div>
          ) : (
            roadmaps.map((item) => <RoadmapCard key={item.id} item={item} onDelete={() => removeRoadmap(item.id)} />)
          )}
        </div>
      )}
    </div>
  );
}
