"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Users, School, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { GUARDIAN_RELATIONSHIPS, GUARDIAN_RELATIONSHIP_LABELS } from "@/lib/gicn";
import { GICN_AGREEMENTS } from "@/lib/policies/gicnAgreements";

interface Props {
  existing: Record<string, string | null> | null;
  agreementsAccepted: boolean;
}

const input =
  "w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 transition border-slate-300 focus:border-accent focus:ring-accent/30";
const inputErr =
  "w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 transition border-red-400 focus:border-red-500 focus:ring-red-200";

export default function RegisterClient({ existing, agreementsAccepted }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<"guardian" | "school">((existing?.kind as "guardian" | "school") ?? "guardian");
  const [f, setF] = useState({
    fullName: existing?.fullName ?? "",
    phone: existing?.phone ?? "",
    relationshipToChild: existing?.relationshipToChild ?? "",
    organizationName: existing?.organizationName ?? "",
    contactPersonName: existing?.contactPersonName ?? "",
    contactPersonRole: existing?.contactPersonRole ?? "",
    contactEmail: existing?.contactEmail ?? "",
    safeguardingLeadName: existing?.safeguardingLeadName ?? "",
    safeguardingLeadContact: existing?.safeguardingLeadContact ?? "",
    addressLine: existing?.addressLine ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "",
    country: existing?.country ?? "Nigeria",
  });
  const [ack, setAck] = useState({ terms: false, privacy: false, safeguarding: false, indemnity: false });
  const [signerName, setSignerName] = useState("");
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needAgreements = !agreementsAccepted;
  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrs((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          ...f,
          agreements: needAgreements
            ? {
                acceptedTerms: ack.terms,
                acceptedPrivacy: ack.privacy,
                acceptedSafeguarding: ack.safeguarding,
                acceptedIndemnity: ack.indemnity,
                acceptedByName: signerName.trim(),
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data.fields) setErrs(data.fields);
        throw new Error(data.error ?? "Could not save your registration.");
      }
      router.push(kind === "school" ? "/gicn/school/bulk" : "/gicn/participants");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const allAcked = ack.terms && ack.privacy && ack.safeguarding && ack.indemnity && signerName.trim().length > 0;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      {/* Account type */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setKind("guardian")} className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${kind === "guardian" ? "border-accent bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
            <Users size={20} className={kind === "guardian" ? "text-accent" : "text-slate-400"} />
            <span className="text-sm font-semibold text-ink">Parent / Guardian</span>
            <span className="text-xs text-slate-500">Register your own children</span>
          </button>
          <button type="button" onClick={() => setKind("school")} className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${kind === "school" ? "border-accent bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
            <School size={20} className={kind === "school" ? "text-accent" : "text-slate-400"} />
            <span className="text-sm font-semibold text-ink">School partner</span>
            <span className="text-xs text-slate-500">Bulk-register students</span>
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{kind === "school" ? "School partner details" : "Your details"}</h2>

        <Field label={kind === "school" ? "Authorised contact — full name" : "Your full legal name"} err={errs.fullName}>
          <input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} className={errs.fullName ? inputErr : input} placeholder="e.g. Amaka Okonkwo" />
        </Field>

        {kind === "guardian" ? (
          <Field label="Relationship to the child(ren)" err={errs.relationshipToChild}>
            <select value={f.relationshipToChild} onChange={(e) => set("relationshipToChild", e.target.value)} className={errs.relationshipToChild ? inputErr : input}>
              <option value="">— Select —</option>
              {GUARDIAN_RELATIONSHIPS.map((r) => <option key={r} value={r}>{GUARDIAN_RELATIONSHIP_LABELS[r]}</option>)}
            </select>
          </Field>
        ) : (
          <>
            <Field label="School / organisation name" err={errs.organizationName}>
              <input value={f.organizationName} onChange={(e) => set("organizationName", e.target.value)} className={errs.organizationName ? inputErr : input} placeholder="e.g. Bright Future Academy" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact person role" err={errs.contactPersonRole}>
                <input value={f.contactPersonRole} onChange={(e) => set("contactPersonRole", e.target.value)} className={errs.contactPersonRole ? inputErr : input} placeholder="e.g. Head Teacher" />
              </Field>
              <Field label="School email" err={errs.contactEmail}>
                <input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={errs.contactEmail ? inputErr : input} placeholder="admin@school.edu.ng" />
              </Field>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" err={errs.phone}>
            <input value={f.phone} onChange={(e) => set("phone", e.target.value)} className={errs.phone ? inputErr : input} placeholder="+234…" />
          </Field>
          <Field label="State" err={errs.state}>
            <input value={f.state} onChange={(e) => set("state", e.target.value)} className={errs.state ? inputErr : input} placeholder="e.g. Lagos" />
          </Field>
        </div>

        <Field label={kind === "school" ? "School address" : "Residential address"} err={errs.addressLine}>
          <input value={f.addressLine} onChange={(e) => set("addressLine", e.target.value)} className={errs.addressLine ? inputErr : input} placeholder="Street address" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" err={errs.city}>
            <input value={f.city} onChange={(e) => set("city", e.target.value)} className={errs.city ? inputErr : input} placeholder="e.g. Ikeja" />
          </Field>
          <Field label="Country" err={errs.country}>
            <input value={f.country} onChange={(e) => set("country", e.target.value)} className={errs.country ? inputErr : input} />
          </Field>
        </div>

        {kind === "school" && (
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <Field label="Designated safeguarding lead" err={errs.safeguardingLeadName}>
              <input value={f.safeguardingLeadName} onChange={(e) => set("safeguardingLeadName", e.target.value)} className={errs.safeguardingLeadName ? inputErr : input} placeholder="Lead name" />
            </Field>
            <Field label="Safeguarding lead contact" err={errs.safeguardingLeadContact}>
              <input value={f.safeguardingLeadContact} onChange={(e) => set("safeguardingLeadContact", e.target.value)} className={errs.safeguardingLeadContact ? inputErr : input} placeholder="Phone or email" />
            </Field>
          </div>
        )}
      </div>

      {/* Agreements */}
      {needAgreements ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Agreements & consent</h2>
            <p className="mt-0.5 text-xs text-slate-500">Version {GICN_AGREEMENTS.version} · Effective {GICN_AGREEMENTS.effectiveDate}. Please read each agreement, then accept.</p>
          </div>
          <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
            {GICN_AGREEMENTS.agreements.map((ag) => (
              <div key={ag.key}>
                <p className="text-xs font-bold text-slate-800">{ag.title}</p>
                {ag.sections.map((s) => (
                  <p key={s.heading} className="mt-1 text-xs leading-relaxed text-slate-600"><span className="font-semibold">{s.heading}.</span> {s.body}</p>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {GICN_AGREEMENTS.agreements.map((ag) => {
              const key = ag.key as keyof typeof ack;
              return (
                <label key={ag.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors ${ack[key] ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-accent/40"}`}>
                  <input type="checkbox" checked={ack[key]} onChange={(e) => setAck((p) => ({ ...p, [key]: e.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600" />
                  <span className="text-xs text-slate-700">{ag.summary}</span>
                </label>
              );
            })}
          </div>
          <Field label="Type your full name as signature" err={errs.agreements}>
            <input value={signerName} onChange={(e) => { setSignerName(e.target.value); setErrs((p) => (p.agreements ? { ...p, agreements: undefined } : p)); }} className={errs.agreements ? inputErr : input} placeholder="Your full name" />
          </Field>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0" /> You have accepted the current GICN agreements ({GICN_AGREEMENTS.version}). You can update your details below without re-signing.
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <Button size="lg" variant="primary" disabled={loading || (needAgreements && !allAcked)}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : existing ? "Save registration" : "Complete registration"}
      </Button>
    </form>
  );
}

function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
