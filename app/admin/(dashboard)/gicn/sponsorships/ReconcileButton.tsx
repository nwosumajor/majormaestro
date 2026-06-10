"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Manually run the Paystack reconciliation for stale pending sponsorships.
export default function ReconcileButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gicn/sponsorships/reconcile", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) alert(d.error ?? "Reconcile failed.");
      else if (!d.configured) alert("Payments aren't configured yet — nothing to reconcile.");
      else alert(`Reconcile complete: ${d.checked} checked · ${d.confirmed} confirmed · ${d.failed} failed.`);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> {busy ? "Reconciling…" : "Reconcile pending"}
    </button>
  );
}
