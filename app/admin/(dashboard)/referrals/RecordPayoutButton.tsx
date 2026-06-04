"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Loader2 } from "lucide-react";

export default function RecordPayoutButton({ referralId, code }: { referralId: string; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function record() {
    const raw = window.prompt(`Record a payout for ${code}. Amount in ₦:`);
    if (!raw) return;
    const n = Number(raw.replace(/[,\s₦]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      alert("Enter a valid positive amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/referrals/${referralId}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNgn: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record payout.");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to record payout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={record}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Banknote size={11} />} Record payout
    </button>
  );
}
