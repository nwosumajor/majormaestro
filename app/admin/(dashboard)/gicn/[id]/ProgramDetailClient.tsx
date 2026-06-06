"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Loader2, CheckCircle2, AlertCircle, ArrowUpCircle, Award, XCircle, Clock, ClipboardCheck } from "lucide-react";

interface Reg {
  id: string;
  status: string;
  checkInCode: string;
  checkedInAt: string | null;
  participantName: string;
  classLevel: string | null;
  guardianName: string;
}

// Tones + labels include legacy values (CONFIRMED/PENDING) for any rows not yet
// caught by the data backfill. Kept local so this client file doesn't import
// lib/gicn (which pulls node:crypto).
const STATUS_TONE: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  WAITLISTED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-slate-100 text-slate-700",
};
const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WAITLISTED: "Waitlisted",
  CANCELLED: "Cancelled",
  CONFIRMED: "Approved",
  PENDING: "Submitted",
};
const PENDING = new Set(["SUBMITTED", "UNDER_REVIEW", "PENDING"]);
const label = (s: string) => STATUS_LABEL[s] ?? s;

export default function ProgramDetailClient({ registrations }: { registrations: Reg[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pending = registrations.filter((r) => PENDING.has(r.status));

  async function checkInByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy("scan");
    setScanMsg(null);
    try {
      const res = await fetch("/api/admin/gicn/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkInCode: code.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check-in failed.");
      setScanMsg({ ok: true, text: data.alreadyCheckedIn ? `${data.participantName} was already checked in.` : `Checked in ${data.participantName} ✓` });
      setCode("");
      router.refresh();
    } catch (err) {
      setScanMsg({ ok: false, text: err instanceof Error ? err.message : "Check-in failed." });
    } finally {
      setBusy(null);
    }
  }

  async function checkInById(id: string) {
    setBusy(id);
    await fetch("/api/admin/gicn/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationId: id }) });
    setBusy(null);
    router.refresh();
  }

  async function promote(id: string) {
    setBusy(id);
    await fetch(`/api/admin/gicn/registrations/${id}/promote`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  async function decide(id: string, action: "approve" | "reject" | "waitlist" | "review", note?: string) {
    setBusy(id);
    setScanMsg(null);
    try {
      const res = await fetch(`/api/admin/gicn/registrations/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanMsg({ ok: false, text: data.error ?? "Action failed." });
        return;
      }
      router.refresh();
    } catch (err) {
      setScanMsg({ ok: false, text: err instanceof Error ? err.message : "Action failed." });
    } finally {
      setBusy(null);
    }
  }

  function reject(id: string) {
    const reason = window.prompt("Reason for rejection (optional — included in the guardian email):");
    if (reason === null) return; // cancelled
    decide(id, "reject", reason.trim() || undefined);
  }

  return (
    <div className="space-y-5">
      {/* Pending review queue */}
      {pending.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-3">
            <ClipboardCheck size={16} className="text-amber-600" />
            <span className="text-sm font-bold text-slate-800">Pending review</span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">{pending.length}</span>
          </div>
          <ul className="divide-y divide-amber-100">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{r.participantName} <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-600"}`}>{label(r.status)}</span></p>
                  <p className="text-xs text-slate-500">{[r.classLevel, `guardian: ${r.guardianName}`].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.status !== "UNDER_REVIEW" && (
                    <button onClick={() => decide(r.id, "review")} disabled={busy === r.id} title="Claim for review" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><Clock size={13} /> Review</button>
                  )}
                  <button onClick={() => decide(r.id, "approve")} disabled={busy === r.id} title="Approve" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                    {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve
                  </button>
                  <button onClick={() => decide(r.id, "waitlist")} disabled={busy === r.id} title="Waitlist" className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"><ArrowUpCircle size={13} /> Waitlist</button>
                  <button onClick={() => reject(r.id)} disabled={busy === r.id} title="Reject" className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><XCircle size={13} /> Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={checkInByCode} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><ScanLine size={16} className="text-emerald-600" /> Check in by code</label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="GICN-XXXXXX"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-emerald-500 focus:outline-none"
            autoFocus
          />
          <button disabled={busy === "scan"} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy === "scan" ? <Loader2 size={15} className="animate-spin" /> : "Check in"}
          </button>
        </div>
        {scanMsg && (
          <p className={`mt-2 flex items-center gap-1.5 text-sm ${scanMsg.ok ? "text-emerald-700" : "text-red-700"}`}>
            {scanMsg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {scanMsg.text}
          </p>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Checked in</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrations.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No registrations yet.</td></tr>
            ) : registrations.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{r.participantName}</p>
                  <p className="text-xs text-slate-400">{[r.classLevel, `guardian: ${r.guardianName}`].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-4 py-3"><code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.checkInCode}</code></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-600"}`}>{label(r.status)}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.checkedInAt ? new Date(r.checkedInAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {r.status === "WAITLISTED" && (
                      <button onClick={() => promote(r.id)} disabled={busy === r.id} title="Promote to approved" className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"><ArrowUpCircle size={16} /></button>
                    )}
                    {!r.checkedInAt && (r.status === "APPROVED" || r.status === "CONFIRMED" || r.status === "WAITLISTED") && (
                      <button onClick={() => checkInById(r.id)} disabled={busy === r.id} title="Check in" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 size={16} /></button>
                    )}
                    <a href={`/api/admin/gicn/registrations/${r.id}/certificate`} title="Certificate (PDF)" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Award size={16} /></a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
