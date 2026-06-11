"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SCHOLARSHIP_STATUS_LABELS,
  SCHOLARSHIP_STATUS_TONE,
  SCHOLARSHIP_ACTIONS,
  canTransition,
  type ScholarshipStatus,
  type ScholarshipAction,
} from "@/lib/scholarship";

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
  reviewNote: string | null;
  hasNin: boolean;
  hasAccount: boolean;
  payoutBankName: string | null;
  payoutAccountLast4: string | null;
  participant: { fullName: string; age: number; schoolName: string | null; classLevel: string | null; guardianName: string };
  programTitle: string;
  reviews: { id: string; reviewerEmail: string; action: string; note: string | null; createdAt: string }[];
  conditions: { id: string; label: string; met: boolean; metBy: string | null; note: string | null }[];
  academicRecords: { id: string; term: string; academicYear: string | null; school: string | null; gradeOrGpa: string | null; attendancePct: number | null; standing: string; note: string | null }[];
  disbursements: { id: string; label: string; amountNgn: number; method: string; reference: string | null; status: string; paidAt: string | null }[];
  documents: { id: string; documentType: string; fileName: string; createdAt: string; uploadedByLabel: string | null }[];
  canDisburse: boolean;
}

// Board actions shown in the dossier, in display order.
const BOARD_ACTIONS: ScholarshipAction[] = [
  "claim", "award", "request_changes", "reject", "verify_activate", "renew", "suspend", "reinstate", "complete", "terminate", "withdraw",
];
const ACTION_LABEL: Record<string, string> = {
  claim: "Claim for review", award: "Award", request_changes: "Request changes", reject: "Reject",
  verify_activate: "Verify & activate", renew: "Renew", suspend: "Suspend", reinstate: "Reinstate",
  complete: "Mark completed", terminate: "Terminate", withdraw: "Withdraw",
};
const NEEDS_NOTE = new Set(["reject", "request_changes", "suspend", "terminate", "withdraw"]);

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function ScholarshipDossier({ award }: { award: Award }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const status = award.status as ScholarshipStatus;

  async function call(url: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? "Action failed."); return null; }
      router.refresh();
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function decide(action: ScholarshipAction) {
    const body: Record<string, unknown> = { action };
    if (action === "award") {
      const amt = prompt("Award amount (₦):", String(award.awardAmountNgn || ""));
      if (amt === null) return;
      body.awardAmountNgn = Number(amt.replace(/[,\s₦]/g, ""));
      body.term = prompt("Term (optional):", award.term ?? "") ?? undefined;
      body.academicYear = prompt("Academic year (optional):", award.academicYear ?? "") ?? undefined;
      body.conditionsSummary = prompt("Conditions summary (optional):", award.conditionsSummary ?? "") ?? undefined;
    } else if (action === "renew" || action === "verify_activate") {
      const d = prompt("Renewal due date (YYYY-MM-DD, optional):", award.renewalDueAt?.slice(0, 10) ?? "");
      if (d) body.renewalDueAt = d;
    }
    if (NEEDS_NOTE.has(action)) {
      const note = prompt(`Reason / note for "${ACTION_LABEL[action]}":`, "");
      if (note === null) return;
      body.note = note;
    } else if (action !== "award" && !confirm(`${ACTION_LABEL[action]} — proceed?`)) {
      return;
    }
    await call(`/api/admin/gicn/scholarships/${award.id}/decide`, body);
  }

  async function reveal(field: "nin" | "account") {
    const code = prompt("Step-up: enter your current 2FA code (or account password) to reveal for payout:");
    if (!code) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gicn/scholarships/${award.id}/reveal`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, stepUpCode: code, stepUpPassword: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) alert(data.error ?? "Reveal failed.");
      else alert(`${field === "nin" ? "NIN" : "Account number"}: ${data.value}\n\n(Logged. Close this once used.)`);
    } finally {
      setBusy(false);
    }
  }

  const actions = BOARD_ACTIONS.filter((a) => SCHOLARSHIP_ACTIONS[a].actor === "board" && canTransition(a, status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900">{award.participant.fullName}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SCHOLARSHIP_STATUS_TONE[status] ?? "bg-slate-100 text-slate-600"}`}>
                {SCHOLARSHIP_STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono">{award.reference ?? "—"}</span> · {award.programTitle} · {naira(award.awardAmountNgn)}
              {award.term ? ` · ${award.term}` : ""}{award.academicYear ? ` ${award.academicYear}` : ""}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Age {award.participant.age} · {award.participant.schoolName ?? "—"} {award.participant.classLevel ? `(${award.participant.classLevel})` : ""} · Guardian: {award.participant.guardianName}
            </p>
            {award.suspendedReason && <p className="mt-2 text-xs text-orange-700">Suspended: {award.suspendedReason}</p>}
            {award.conditionsSummary && <p className="mt-2 text-xs text-slate-600">Conditions: {award.conditionsSummary}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.length === 0 ? <span className="text-xs text-slate-400">No actions in this state</span> : actions.map((a) => (
              <button key={a} onClick={() => decide(a)} disabled={busy}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${a === "award" || a === "verify_activate" || a === "reinstate" ? "bg-emerald-600 text-white hover:bg-emerald-500" : a === "reject" || a === "terminate" ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"}`}>
                {ACTION_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conditions */}
        <Section title="Compliance conditions">
          <ul className="space-y-2">
            {award.conditions.length === 0 && <li className="text-xs text-slate-400">No conditions yet.</li>}
            {award.conditions.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={c.met} disabled={busy}
                  onChange={(e) => call(`/api/admin/gicn/scholarships/${award.id}/conditions`, { conditionId: c.id, met: e.target.checked }, "PATCH")}
                  className="mt-0.5" />
                <span className={c.met ? "text-slate-400 line-through" : "text-slate-700"}>{c.label}{c.note ? ` — ${c.note}` : ""}</span>
              </li>
            ))}
          </ul>
          <AddInline placeholder="New condition…" disabled={busy} onAdd={(label) => call(`/api/admin/gicn/scholarships/${award.id}/conditions`, { label })} />
        </Section>

        {/* Documents */}
        <Section title="Document vault">
          <ul className="space-y-1.5 text-sm">
            {award.documents.length === 0 && <li className="text-xs text-slate-400">No documents uploaded yet (guardian onboarding).</li>}
            {award.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="text-slate-700">{d.fileName} <span className="text-xs text-slate-400">({d.documentType})</span></span>
                <a href={`/api/admin/gicn/scholarships/${award.id}/documents/${d.id}`} className="text-xs font-semibold text-blue-700 hover:underline">Download</a>
              </li>
            ))}
          </ul>
        </Section>

        {/* Academic records */}
        <Section title="Academic monitoring">
          <ul className="space-y-2 text-sm">
            {award.academicRecords.length === 0 && <li className="text-xs text-slate-400">No academic records yet.</li>}
            {award.academicRecords.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{r.term}{r.academicYear ? ` · ${r.academicYear}` : ""}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.standing === "breach" ? "bg-red-100 text-red-700" : r.standing === "at_risk" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{r.standing.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-slate-500">{r.school ?? "—"} · Grade {r.gradeOrGpa ?? "—"} · Attendance {r.attendancePct != null ? `${r.attendancePct}%` : "—"}{r.note ? ` · ${r.note}` : ""}</p>
              </li>
            ))}
          </ul>
          <AcademicForm disabled={busy} onAdd={(body) => call(`/api/admin/gicn/scholarships/${award.id}/academic`, body)} />
        </Section>

        {/* Disbursements */}
        <Section title="Disbursement ledger">
          {!award.canDisburse ? <p className="text-xs text-slate-400">Requires the scholarship.disburse permission.</p> : (
            <>
              <ul className="space-y-2 text-sm">
                {award.disbursements.length === 0 && <li className="text-xs text-slate-400">No disbursements yet.</li>}
                {award.disbursements.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5">
                    <div>
                      <p className="font-semibold text-slate-800">{naira(d.amountNgn)} <span className="text-xs font-normal text-slate-500">· {d.label} · {d.method}</span></p>
                      <p className="text-[11px] text-slate-400">{d.status}{d.paidAt ? ` · ${new Date(d.paidAt).toLocaleDateString("en-NG")}` : ""}</p>
                    </div>
                    {d.status === "scheduled" && (
                      <button onClick={() => call(`/api/admin/gicn/scholarships/${award.id}/disbursements`, { disbursementId: d.id, status: "paid" }, "PATCH")} disabled={busy}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Mark paid</button>
                    )}
                  </li>
                ))}
              </ul>
              <DisbursementForm disabled={busy} onAdd={(body) => call(`/api/admin/gicn/scholarships/${award.id}/disbursements`, body)} />
            </>
          )}
        </Section>

        {/* Payout details */}
        {award.canDisburse && (
          <Section title="Payout details (encrypted)">
            <p className="text-xs text-slate-500">
              NIN: {award.hasNin ? "on file (encrypted)" : "not set"} · Account: {award.payoutBankName ?? "—"} {award.payoutAccountLast4 ? `••••${award.payoutAccountLast4}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {award.hasNin && <button onClick={() => reveal("nin")} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Reveal NIN</button>}
              {award.hasAccount && <button onClick={() => reveal("account")} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Reveal account</button>}
            </div>
            <PayoutForm disabled={busy} onSave={(body) => call(`/api/admin/gicn/scholarships/${award.id}/payout`, body)} />
          </Section>
        )}

        {/* Timeline */}
        <Section title="Review timeline">
          <ol className="space-y-2 text-sm">
            {award.reviews.length === 0 && <li className="text-xs text-slate-400">No activity yet.</li>}
            {award.reviews.map((r) => (
              <li key={r.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-slate-700"><span className="font-semibold">{r.action.replace(/_/g, " ")}</span> — {r.reviewerEmail}</p>
                {r.note && <p className="text-xs text-slate-500">{r.note}</p>}
                <p className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString("en-NG")}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

function AddInline({ placeholder, disabled, onAdd }: { placeholder: string; disabled: boolean; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }} className="mt-3 flex gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <button disabled={disabled || !v.trim()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add</button>
    </form>
  );
}

function AcademicForm({ disabled, onAdd }: { disabled: boolean; onAdd: (b: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ term: "", academicYear: "", school: "", gradeOrGpa: "", attendancePct: "", standing: "on_track", note: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!f.term.trim()) return; onAdd({ ...f, attendancePct: f.attendancePct ? Number(f.attendancePct) : undefined }); setF({ term: "", academicYear: "", school: "", gradeOrGpa: "", attendancePct: "", standing: "on_track", note: "" }); }} className="mt-3 grid grid-cols-2 gap-2">
      <input value={f.term} onChange={set("term")} placeholder="Term *" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.academicYear} onChange={set("academicYear")} placeholder="Year" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.school} onChange={set("school")} placeholder="School" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.gradeOrGpa} onChange={set("gradeOrGpa")} placeholder="Grade/GPA" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.attendancePct} onChange={set("attendancePct")} inputMode="numeric" placeholder="Attendance %" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <select value={f.standing} onChange={set("standing")} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm">
        <option value="on_track">on track</option><option value="at_risk">at risk</option><option value="breach">breach</option>
      </select>
      <input value={f.note} onChange={set("note")} placeholder="Note" className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <button disabled={disabled || !f.term.trim()} className="col-span-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add academic record</button>
    </form>
  );
}

function DisbursementForm({ disabled, onAdd }: { disabled: boolean; onAdd: (b: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ label: "", amountNgn: "", method: "bank", reference: "", note: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); const amt = Number(f.amountNgn.replace(/[,\s₦]/g, "")); if (!f.label.trim() || !(amt > 0)) return; onAdd({ ...f, amountNgn: amt }); setF({ label: "", amountNgn: "", method: "bank", reference: "", note: "" }); }} className="mt-3 grid grid-cols-2 gap-2">
      <input value={f.label} onChange={set("label")} placeholder="Label *" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.amountNgn} onChange={set("amountNgn")} inputMode="numeric" placeholder="Amount ₦ *" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <select value={f.method} onChange={set("method")} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm">
        <option value="bank">bank</option><option value="cash">cash</option><option value="paystack">paystack</option>
      </select>
      <input value={f.reference} onChange={set("reference")} placeholder="Reference" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <button disabled={disabled} className="col-span-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add disbursement</button>
    </form>
  );
}

function PayoutForm({ disabled, onSave }: { disabled: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ bankName: "", accountNumber: "", nin: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); const b: Record<string, unknown> = {}; if (f.bankName) b.bankName = f.bankName; if (f.accountNumber) b.accountNumber = f.accountNumber; if (f.nin) b.nin = f.nin; if (Object.keys(b).length) { onSave(b); setF({ bankName: "", accountNumber: "", nin: "" }); } }} className="mt-3 grid grid-cols-1 gap-2">
      <input value={f.bankName} onChange={set("bankName")} placeholder="Bank name" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.accountNumber} onChange={set("accountNumber")} inputMode="numeric" placeholder="Account number (10-digit NUBAN)" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <input value={f.nin} onChange={set("nin")} inputMode="numeric" placeholder="NIN (11 digits)" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
      <button disabled={disabled} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save payout details (encrypted)</button>
    </form>
  );
}
