"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, Plus, Trash2, UserPlus, CalendarPlus, X, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import QrCode from "@/components/gicn/QrCode";

interface Participant {
  id: string;
  fullName: string;
  dateOfBirth: string;
  schoolName: string | null;
  classLevel: string | null;
  guardianName: string;
  mediaReleaseGranted: boolean;
  consentGrantedAt: string;
}
interface ProgramOption { id: string; title: string }

function ageFrom(dob: string) {
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

export default function ParticipantsClient({ isSchool }: { isSchool: boolean }) {
  const [items, setItems] = useState<Participant[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [registerFor, setRegisterFor] = useState<Participant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, progRes] = await Promise.all([
      fetch("/api/gicn/participants", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch("/api/gicn/programs", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [] })),
    ]);
    setItems(pRes.items ?? []);
    setPrograms((progRes.items ?? []).map((p: ProgramOption) => ({ id: p.id, title: p.title })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Remove this participant? This also cancels their programme registrations.")) return;
    const res = await fetch(`/api/gicn/participants/${id}`, { method: "DELETE" });
    if (res.ok) setItems((x) => x.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} record{items.length === 1 ? "" : "s"}</p>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add {isSchool ? "student" : "child"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <UserPlus size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">No participants yet. Add one to register them for programmes.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{p.fullName} <span className="ml-1 text-xs font-normal text-slate-400">age {ageFrom(p.dateOfBirth)}</span></p>
                <p className="text-xs text-slate-500">
                  {[p.classLevel, p.schoolName].filter(Boolean).join(" · ") || "—"} · guardian: {p.guardianName}
                  {p.mediaReleaseGranted && <span className="ml-1 text-accent">· media OK</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setRegisterFor(p)}><CalendarPlus size={14} /> Register</Button>
                <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAdd && <AddModal isSchool={isSchool} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
      {registerFor && <RegisterModal participant={registerFor} programs={programs} onClose={() => setRegisterFor(null)} />}
    </div>
  );
}

function AddModal({ isSchool, onClose, onAdded }: { isSchool: boolean; onClose: () => void; onAdded: () => void }) {
  const [f, setF] = useState({ fullName: "", dateOfBirth: "", classLevel: "", schoolName: "", address: "", guardianName: "" });
  const [consent, setConsent] = useState(false);
  const [media, setMedia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError("Parental/guardian consent is required to register a child.");
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, consentGranted: true, mediaReleaseGranted: media }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add participant.");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none";

  return (
    <Modal title={`Add ${isSchool ? "student" : "child"}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-800">Child&apos;s full name <span className="text-red-500">*</span></label>
            <input value={f.fullName} onChange={set("fullName")} required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Date of birth <span className="text-red-500">*</span></label>
            <input type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} required className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Class level</label>
            <input value={f.classLevel} onChange={set("classLevel")} className={input} placeholder="e.g. JSS 2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">School</label>
            <input value={f.schoolName} onChange={set("schoolName")} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Parent/guardian name <span className="text-red-500">*</span></label>
            <input value={f.guardianName} onChange={set("guardianName")} required className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-800">Address</label>
            <input value={f.address} onChange={set("address")} className={input} />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-emerald-600" />
          <span className="text-slate-700"><strong>I consent</strong> as the parent/guardian (or authorised school representative) to GICN processing this child&apos;s data under NDPA 2023. <span className="text-red-500">*</span></span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <input type="checkbox" checked={media} onChange={(e) => setMedia(e.target.checked)} className="mt-0.5 size-4 accent-emerald-600" />
          <span className="text-slate-700">Optional: I allow GICN to use photos/video of this child in programme media.</span>
        </label>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}

        <Button variant="primary" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : "Add participant"}</Button>
      </form>
    </Modal>
  );
}

function RegisterModal({ participant, programs, onClose }: { participant: Participant; programs: ProgramOption[]; onClose: () => void }) {
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; checkInCode: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!programId) return setError("Select a programme.");
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id, programId }),
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
    <Modal title={`Register ${participant.fullName}`} onClose={onClose}>
      {result ? (
        <div className="text-center">
          <CheckCircle2 size={36} className="mx-auto mb-3 text-accent" />
          <p className="text-sm text-slate-600">
            {result.status === "WAITLISTED" ? "Added to the waitlist — we'll notify you if a spot opens." : "Registered and confirmed!"}
          </p>
          <p className="mt-3 text-xs text-slate-500">Check-in code — show this QR at the door</p>
          <code className="mt-1 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-figure text-lg font-semibold text-ink">{result.checkInCode}</code>
          <div className="mt-3 flex justify-center"><QrCode value={result.checkInCode} size={140} /></div>
          <div className="mt-5"><Button variant="primary" onClick={onClose}>Done</Button></div>
        </div>
      ) : programs.length === 0 ? (
        <p className="text-sm text-slate-500">No open programmes right now. Check back soon.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Programme</label>
            <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none">
              {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
          <Button variant="primary" disabled={loading}>{loading ? <><Loader2 size={16} className="animate-spin" /> Registering…</> : "Register"}</Button>
        </form>
      )}
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
