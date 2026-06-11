"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { SCHOLARSHIP_STATUS_LABELS, SCHOLARSHIP_STATUS_TONE } from "@/lib/scholarship";

interface Award {
  id: string;
  reference: string | null;
  status: string;
  awardAmountNgn: number;
  term: string | null;
  academicYear: string | null;
  conditionsSummary: string | null;
  renewalDueAt: string | null;
  suspendedReason: string | null;
  childName: string;
  programTitle: string;
  hasNin: boolean;
  payoutBankName: string | null;
  payoutAccountLast4: string | null;
  conditions: { id: string; label: string; met: boolean }[];
  academicRecords: { id: string; term: string; academicYear: string | null; gradeOrGpa: string | null; attendancePct: number | null; standing: string }[];
  disbursements: { id: string; label: string; amountNgn: number; status: string; paidAt: string | null }[];
  documents: { id: string; documentType: string; fileName: string; createdAt: string }[];
}

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function ScholarshipProfileClient({ award }: { award: Award }) {
  const router = useRouter();
  const canUpload = ["awarded", "onboarding", "active"].includes(award.status);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-slate-900">{award.childName}</h1>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SCHOLARSHIP_STATUS_TONE[award.status as keyof typeof SCHOLARSHIP_STATUS_TONE] ?? "bg-slate-100 text-slate-600"}`}>
            {SCHOLARSHIP_STATUS_LABELS[award.status as keyof typeof SCHOLARSHIP_STATUS_LABELS] ?? award.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {award.programTitle}{award.term ? ` · ${award.term}` : ""} · <span className="font-mono">{award.reference ?? "—"}</span>
          {award.awardAmountNgn > 0 ? ` · ${naira(award.awardAmountNgn)}` : ""}
        </p>
        {award.status === "suspended" && award.suspendedReason && <p className="mt-2 text-xs text-orange-700">Suspended: {award.suspendedReason}</p>}
        {award.conditionsSummary && <p className="mt-2 text-xs text-slate-600">Conditions: {award.conditionsSummary}</p>}
      </div>

      {award.status === "awarded" ? (
        <OnboardingForm awardId={award.id} conditions={award.conditions} onDone={() => router.refresh()} />
      ) : award.status === "applied" || award.status === "under_review" ? (
        <Card><p className="text-sm text-slate-600">Your application is <strong>{SCHOLARSHIP_STATUS_LABELS[award.status as keyof typeof SCHOLARSHIP_STATUS_LABELS]}</strong>. We&apos;ll email you when the review board reaches a decision.</p></Card>
      ) : award.status === "onboarding" ? (
        <Card><p className="text-sm text-slate-600">Thanks — your onboarding has been submitted and is awaiting board verification. We&apos;ll email you when the scholarship is activated.</p></Card>
      ) : null}

      {/* Monitored profile (read-only) */}
      {["active", "suspended", "completed", "terminated", "onboarding"].includes(award.status) && (
        <>
          {award.conditions.length > 0 && (
            <Card title="Conditions">
              <ul className="space-y-1.5 text-sm">
                {award.conditions.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${c.met ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className={c.met ? "text-slate-400 line-through" : "text-slate-700"}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {award.academicRecords.length > 0 && (
            <Card title="Academic progress">
              <ul className="space-y-2 text-sm">
                {award.academicRecords.map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <span className="text-slate-700">{r.term}{r.academicYear ? ` · ${r.academicYear}` : ""} — Grade {r.gradeOrGpa ?? "—"}, Attendance {r.attendancePct != null ? `${r.attendancePct}%` : "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.standing === "breach" ? "bg-red-100 text-red-700" : r.standing === "at_risk" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{r.standing.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {award.disbursements.length > 0 && (
            <Card title="Disbursements">
              <ul className="space-y-1.5 text-sm">
                {award.disbursements.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span className="text-slate-700">{naira(d.amountNgn)} · {d.label}</span>
                    <span className="text-xs text-slate-500">{d.status}{d.paidAt ? ` · ${new Date(d.paidAt).toLocaleDateString("en-NG")}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* Documents */}
      <Card title="Documents">
        <ul className="space-y-1.5 text-sm">
          {award.documents.length === 0 && <li className="text-xs text-slate-400">No documents uploaded yet.</li>}
          {award.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <span className="text-slate-700">{d.fileName} <span className="text-xs text-slate-400">({d.documentType})</span></span>
              <a href={`/api/gicn/scholarships/${award.id}/documents/${d.id}`} className="text-xs font-semibold text-emerald-700 hover:underline">Download</a>
            </li>
          ))}
        </ul>
        {canUpload && <DocumentUpload awardId={award.id} onDone={() => router.refresh()} />}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>}
      {children}
    </div>
  );
}

function OnboardingForm({ awardId, conditions, onDone }: { awardId: string; conditions: { id: string; label: string }[]; onDone: () => void }) {
  const [f, setF] = useState({ bankName: "", accountNumber: "", nin: "" });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!accept) return setError("Please accept the scholarship conditions.");
    setLoading(true);
    try {
      const res = await fetch(`/api/gicn/scholarships/${awardId}/onboard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, acceptConditions: accept }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit onboarding.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-6">
      <div className="flex items-start gap-2">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
        <p className="text-sm font-semibold text-emerald-900">Your child has been awarded a scholarship — complete onboarding to activate it.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={f.bankName} onChange={set("bankName")} placeholder="Payout bank name *" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" />
        <input value={f.accountNumber} onChange={set("accountNumber")} inputMode="numeric" placeholder="Account number (10-digit NUBAN) *" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" />
      </div>
      <input value={f.nin} onChange={set("nin")} inputMode="numeric" placeholder="Child/guardian NIN (11 digits) *" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" />
      {conditions.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold text-slate-600">Scholarship conditions:</p>
          <ul className="list-disc pl-5 text-xs text-slate-600">{conditions.map((c) => <li key={c.id}>{c.label}</li>)}</ul>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5" />
        I confirm the details are accurate and I accept the scholarship conditions on behalf of my child.
      </label>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
      <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit onboarding"}
      </button>
      <p className="text-[11px] text-slate-400">Your NIN and account number are encrypted at rest and only revealed to authorised staff at payout. NDPA 2023.</p>
    </form>
  );
}

function DocumentUpload({ awardId, onDone }: { awardId: string; onDone: () => void }) {
  const [type, setType] = useState("admission_letter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", type);
      const res = await fetch(`/api/gicn/scholarships/${awardId}/documents`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs">
        <option value="admission_letter">Admission letter</option>
        <option value="results">Results</option>
        <option value="id_card">ID card</option>
        <option value="birth_certificate">Birth certificate</option>
        <option value="other">Other</option>
      </select>
      <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${busy ? "opacity-50" : ""}`}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload (PDF/Excel/CSV)
        <input type="file" accept=".pdf,.xls,.xlsx,.csv" onChange={upload} disabled={busy} className="hidden" />
      </label>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
