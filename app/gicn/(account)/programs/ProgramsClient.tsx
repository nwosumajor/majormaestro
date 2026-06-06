"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CalendarDays, MapPin, Users, CheckCircle2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import QrCode from "@/components/gicn/QrCode";

interface ProgramView {
  id: string;
  title: string;
  typeLabel: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string | null;
  capacity: number | null;
  confirmed: number;
  spotsLeft: number | null;
}
interface Participant { id: string; fullName: string }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProgramsClient({ programs }: { programs: ProgramView[] }) {
  const [registerFor, setRegisterFor] = useState<ProgramView | null>(null);

  if (programs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <CalendarDays size={28} className="mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">No open programmes right now. Please check back soon.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {programs.map((p) => {
        const full = p.spotsLeft === 0;
        return (
          <div key={p.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Badge tone="accent">{p.typeLabel}</Badge>
              {full && <Badge tone="warning">Waitlist only</Badge>}
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">{p.title}</h2>
            {p.description && <p className="mt-1 line-clamp-3 text-sm text-slate-500">{p.description}</p>}
            <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
              <div className="flex items-center gap-2"><CalendarDays size={14} className="text-slate-400" /> {fmtDate(p.startsAt)} – {fmtDate(p.endsAt)}</div>
              {p.location && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {p.location}</div>}
              <div className="flex items-center gap-2"><Users size={14} className="text-slate-400" /> {p.capacity != null ? `${p.confirmed}/${p.capacity} confirmed` : `${p.confirmed} confirmed · open capacity`}</div>
            </dl>
            <div className="mt-4 pt-2">
              <Button variant={full ? "outline" : "primary"} size="sm" onClick={() => setRegisterFor(p)}>
                {full ? "Join waitlist" : "Register a participant"}
              </Button>
            </div>
          </div>
        );
      })}

      {registerFor && <RegisterModal program={registerFor} onClose={() => setRegisterFor(null)} />}
    </div>
  );
}

function RegisterModal({ program, onClose }: { program: ProgramView; onClose: () => void }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; checkInCode: string } | null>(null);

  useEffect(() => {
    fetch("/api/gicn/participants", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        const list: Participant[] = (d.items ?? []).map((p: Participant) => ({ id: p.id, fullName: p.fullName }));
        setParticipants(list);
        setParticipantId(list[0]?.id ?? "");
      })
      .finally(() => setLoadingList(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!participantId) return setError("Select a participant.");
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, programId: program.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not register.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{program.title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        {result ? (
          <div className="text-center">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-accent" />
            <p className="text-sm text-slate-600">
              {result.status === "SUBMITTED"
                ? "Submitted — pending approval. We'll email you once it's reviewed."
                : result.status === "WAITLISTED"
                  ? "Added to the waitlist — we'll notify you if a spot opens."
                  : "Registered and confirmed!"}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {result.status === "SUBMITTED" ? "Your check-in code (valid once approved)" : "Check-in code — show this QR at the door"}
            </p>
            <code className="mt-1 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-figure text-lg font-semibold text-ink">{result.checkInCode}</code>
            <div className="mt-3 flex justify-center"><QrCode value={result.checkInCode} size={140} /></div>
            <div className="mt-5"><Button variant="primary" onClick={onClose}>Done</Button></div>
          </div>
        ) : loadingList ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : participants.length === 0 ? (
          <p className="text-sm text-slate-500">You have no participants yet. Add a child or student first on the Participants page.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">Participant</label>
              <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none">
                {participants.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </div>
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
            <Button variant="primary" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Registering…</> : "Register"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
