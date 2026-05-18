"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Users,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileSpreadsheet,
  X,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface BulkProfile {
  name: string;
  psychological: string;
  mental: string;
  social: string;
  environmental: string;
  certificates: string;
}

interface ClassificationResult {
  rank: number;
  departmentName: string;
  industryCategory: string;
  reasoning: string;
  confidenceScore: number;
  skillGaps: string[];
}

interface BulkResult {
  name: string;
  results: ClassificationResult[];
}

const TEMPLATE_HEADERS = ["name", "psychological", "mental", "social", "environmental", "certificates"];
const TEMPLATE_SAMPLE: BulkProfile[] = [
  { name: "Jane Doe", psychological: "Detail-oriented, analytical, risk-averse", mental: "Strong numerical reasoning, fast learner", social: "Collaborative, clear communicator", environmental: "Thrives in structured, high-stakes environments", certificates: "CFA Level 1, ACCA" },
  { name: "John Smith", psychological: "Creative, extroverted, motivated by impact", mental: "Strategic thinker, strong problem-solver", social: "Natural leader, excellent networker", environmental: "Fast-paced, autonomous work preferred", certificates: "PMP, AWS Cloud Practitioner" },
];

function downloadTemplate() {
  const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: TEMPLATE_SAMPLE });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "careerai-bulk-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const RANK_COLORS: Record<number, string> = { 1: "bg-amber-100 text-amber-800 border-amber-300", 2: "bg-slate-100 text-slate-700 border-slate-300", 3: "bg-orange-100 text-orange-700 border-orange-300" };

function ResultRow({ result }: { result: BulkResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left">
        <div>
          <p className="text-sm font-semibold text-slate-900">{result.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.results.slice(0, 3).map((r) => (
              <span key={r.rank} className={`rounded-full border px-2 py-0.5 text-xs font-medium ${RANK_COLORS[r.rank]}`}>
                #{r.rank} {r.departmentName} ({r.confidenceScore}%)
              </span>
            ))}
          </div>
        </div>
        {open ? <ChevronUp size={15} className="shrink-0 text-slate-400" /> : <ChevronDown size={15} className="shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-3">
          {result.results.map((r) => (
            <div key={r.rank} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">#{r.rank} {r.departmentName}</p>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${r.confidenceScore}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">{r.confidenceScore}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-2">{r.industryCategory}</p>
              <p className="text-xs leading-relaxed text-slate-600 mb-2">{r.reasoning}</p>
              {r.skillGaps.length > 0 && (
                <ul className="space-y-0.5">
                  {r.skillGaps.map((g, i) => <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5"><span className="mt-1 h-1 w-1 rounded-full bg-red-400 shrink-0" />{g}</li>)}
                </ul>
              )}
            </div>
          ))}
          <Link href={`/roadmap?currentRole=${encodeURIComponent(result.name)}&targetRole=${encodeURIComponent(result.results[0].departmentName)}&fromBridge=true`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
            <TrendingUp size={12} />Build Roadmap for {result.results[0].departmentName}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function BulkPage() {
  const [profiles, setProfiles] = useState<BulkProfile[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResults([]);
    setFileName(file.name);

    Papa.parse<BulkProfile>(file, {
      header: true,
      skipEmptyLines: true,
      complete(parsed) {
        const valid = parsed.data.filter((row) => row.name && row.psychological && row.mental && row.social && row.environmental);
        if (valid.length === 0) {
          setParseError("No valid rows found. Ensure all required columns are filled.");
          setProfiles([]);
        } else if (valid.length > 20) {
          setParseError("Maximum 20 profiles per batch. Only the first 20 will be processed.");
          setProfiles(valid.slice(0, 20));
        } else {
          setProfiles(valid);
        }
      },
      error(err) {
        setParseError(`CSV parse error: ${err.message}`);
      },
    });

    if (fileRef.current) fileRef.current.value = "";
  }

  function clearFile() {
    setProfiles([]);
    setFileName(null);
    setParseError(null);
    setResults([]);
  }

  async function handleProcess() {
    if (profiles.length === 0) return;
    setApiError(null);
    setResults([]);
    setLoading(true);
    try {
      const res = await fetch("/api/bulk-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResults(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  function downloadResults() {
    if (results.length === 0) return;
    const rows = results.flatMap((r) =>
      r.results.map((res) => ({
        name: r.name,
        rank: res.rank,
        departmentName: res.departmentName,
        industryCategory: res.industryCategory,
        confidenceScore: res.confidenceScore,
        skillGaps: res.skillGaps.join("; "),
        reasoning: res.reasoning,
      }))
    );
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white">
          <FileSpreadsheet size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bulk Staff Classification</h1>
        <p className="mt-2 text-base text-slate-600">Upload a CSV of up to 20 staff profiles and classify the entire team in one run. Perfect for HR managers doing periodic placement reviews.</p>
      </div>

      {/* Step 1: Download template */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Step 1 — Download the template</h2>
        <p className="mb-4 text-sm text-slate-500">Fill in the CSV with one staff member per row. All columns except <code className="rounded bg-slate-100 px-1 text-xs">certificates</code> are required.</p>
        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-teal-400 hover:text-teal-700 transition-colors">
          <Download size={15} />Download CSV Template
        </button>
      </div>

      {/* Step 2: Upload */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Step 2 — Upload your completed CSV</h2>
        <p className="mb-4 text-sm text-slate-500">Max 20 profiles per batch.</p>

        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 px-6 py-10 text-center hover:bg-teal-100 transition-colors">
            <Upload size={24} className="text-teal-400" />
            <span className="text-sm font-medium text-teal-700">Click to select CSV file</span>
            <span className="text-xs text-slate-500">Only .csv files accepted</span>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-teal-800">{fileName}</p>
                <p className="text-xs text-slate-500">{profiles.length} valid profile{profiles.length !== 1 ? "s" : ""} detected</p>
              </div>
            </div>
            <button onClick={clearFile} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {parseError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />{parseError}
          </div>
        )}
      </div>

      {/* Preview table */}
      {profiles.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Preview — {profiles.length} profile{profiles.length !== 1 ? "s" : ""}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Psychological</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Certs</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{p.psychological}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.certificates || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process button */}
      <button onClick={handleProcess} disabled={loading || profiles.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 mb-6">
        {loading ? <><Loader2 size={16} className="animate-spin" />Classifying {profiles.length} profiles…</> : <><Users size={16} />Run Bulk Classification</>}
      </button>

      {loading && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-700">
          Processing profiles in batches of 4. This may take up to {Math.ceil(profiles.length / 4) * 15} seconds…
        </div>
      )}

      {apiError && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Results — {results.length} staff classified</h2>
            <button onClick={downloadResults} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors">
              <Download size={13} />Export CSV
            </button>
          </div>
          <div className="space-y-3">
            {results.map((r) => <ResultRow key={r.name} result={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
