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

// Manual bookkeeping statuses only. "refunded" is NOT here — refunds must move
// money through the real Paystack flow (the Refund button), never a label change.
const STATUSES = ["pending", "paid", "cancelled"];
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

  async function refund(id: string) {
    if (!confirm("Refund this sponsorship to the sponsor's original payment method? This moves money via Paystack and cannot be undone.")) return;
    setBusy(id);
    const res = await fetch(`/api/admin/gicn/sponsorships/${id}/refund`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) alert(data.error ?? "Refund failed.");
    router.refresh();
  }

  async function verify(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/gicn/sponsorships/${id}/verify`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) alert(data.error ?? "Verify failed.");
    else if (data.outcome === "pending") alert("Still pending at Paystack — no payment found yet.");
    else if (data.outcome === "paid") alert("Confirmed — payment received.");
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
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No sponsorships yet.</td></tr>
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
                  {!STATUSES.includes(r.status) && <option value={r.status}>{r.status}</option>}
                </select>
              </td>
              <td className="px-4 py-3 text-right">
                {r.status === "pending" && (
                  <button
                    onClick={() => verify(r.id)}
                    disabled={busy === r.id}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Verify
                  </button>
                )}
                {r.status === "paid" && (
                  <button
                    onClick={() => refund(r.id)}
                    disabled={busy === r.id}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
