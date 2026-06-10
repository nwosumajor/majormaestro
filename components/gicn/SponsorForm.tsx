"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface ProgramOption { id: string; title: string }

function newKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SponsorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [programId, setProgramId] = useState("");
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Idempotency key: stable across double-clicks / retries of the SAME pledge,
  // regenerated whenever the inputs change (a genuinely new pledge = new key).
  const [idemKey, setIdemKey] = useState(() => newKey());

  useEffect(() => {
    fetch("/api/gicn/programs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setPrograms((d.items ?? []).map((p: ProgramOption) => ({ id: p.id, title: p.title }))))
      .catch(() => {});
  }, []);

  // Field edits start a fresh payment intent (so an edited pledge is a new
  // transaction, while pure double-clicks/retries keep the same key).
  function bump<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setIdemKey(newKey()); };
  }
  const onName = bump(setName);
  const onEmail = bump(setEmail);
  const onAmount = bump(setAmount);
  const onProgram = bump(setProgramId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // re-entrancy guard — a second click can't fire a second request
    setError(null);
    const amountNgn = Number(amount.replace(/[,\s₦]/g, ""));
    if (!Number.isFinite(amountNgn) || amountNgn <= 0) return setError("Enter a valid amount in ₦.");
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorName: name, sponsorEmail: email, amountNgn, programId: programId || undefined, idempotencyKey: idemKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record your sponsorship.");
      // Already paid (e.g. a retried submit after success) → go to the completed view, never re-charge.
      if (data.alreadyPaid && data.redirect) {
        window.location.href = data.redirect as string;
        return;
      }
      // Configured gateway → redirect to Paystack hosted checkout.
      if (data.payment?.redirectUrl) {
        window.location.href = data.payment.redirectUrl as string;
        return; // keep the spinner up while the browser navigates away
      }
      // Stub mode (no gateway) → show the pending acknowledgement.
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={36} className="mx-auto mb-3 text-accent" />
        <h2 className="font-display text-xl font-semibold text-ink">Thank you, {name.split(" ")[0] || "friend"}!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your sponsorship is recorded as <strong>pending</strong>. We&apos;ve emailed {email} and our team will reach out with payment details to complete it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Your name <span className="text-red-500">*</span></label>
          <input value={name} onChange={(e) => onName(e.target.value)} required className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none" placeholder="Full name" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Email <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={(e) => onEmail(e.target.value)} required className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none" placeholder="you@email.com" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Amount (₦) <span className="text-red-500">*</span></label>
        <input value={amount} onChange={(e) => onAmount(e.target.value)} required inputMode="numeric" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none" placeholder="e.g. 50,000" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Earmark to a programme <span className="font-normal text-slate-400">(optional)</span></label>
        <select value={programId} onChange={(e) => onProgram(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none">
          <option value="">General fund (where most needed)</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <Button size="lg" variant="primary" disabled={loading}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Redirecting to secure checkout…</> : <><HeartHandshake size={16} /> Continue to secure payment</>}
      </Button>
      <p className="text-center text-xs text-slate-400">You&apos;ll be redirected to Paystack to complete your gift securely — card, bank transfer or USSD. Your data is handled under NDPA 2023.</p>
    </form>
  );
}
