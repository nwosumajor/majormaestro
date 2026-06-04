"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  id: string;
  sponsorName: string;
  sponsorEmail: string;
  amountNgn: number;
  status: string;
  createdAt: string;
  programTitle: string | null;
}

const STATUSES = ["pending", "paid", "refunded", "cancelled"];
const TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function SponsorshipsAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    await fetch(`/api/admin/gicn/sponsorships/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">Sponsor</th>
            <th className="px-4 py-3">Programme</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No sponsorships yet.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{r.sponsorName}</p>
                <p className="text-xs text-slate-400">{r.sponsorEmail}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.programTitle ?? <span className="text-slate-400">General fund</span>}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">₦{r.amountNgn.toLocaleString("en-NG")}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
              <td className="px-4 py-3">
                <select
                  value={r.status}
                  disabled={busy === r.id}
                  onChange={(e) => setStatus(r.id, e.target.value)}
                  className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${TONE[r.status] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
