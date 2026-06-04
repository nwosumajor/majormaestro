"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Loader2, CheckCircle2, AlertCircle, ArrowUpCircle, Award } from "lucide-react";

interface Reg {
  id: string;
  status: string;
  checkInCode: string;
  checkedInAt: string | null;
  participantName: string;
  classLevel: string | null;
  guardianName: string;
}

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  WAITLISTED: "bg-amber-100 text-amber-700",
  PENDING: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ProgramDetailClient({ registrations }: { registrations: Reg[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
    <div className="space-y-5">
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
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-600"}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.checkedInAt ? new Date(r.checkedInAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {r.status === "WAITLISTED" && (
                      <button onClick={() => promote(r.id)} disabled={busy === r.id} title="Promote to confirmed" className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"><ArrowUpCircle size={16} /></button>
                    )}
                    {!r.checkedInAt && r.status !== "CANCELLED" && (
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
