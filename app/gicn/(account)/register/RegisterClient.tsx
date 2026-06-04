"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Users, School } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  existing: { kind: string; organizationName: string | null; phone: string | null } | null;
}

export default function RegisterClient({ existing }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<"guardian" | "school">((existing?.kind as "guardian" | "school") ?? "guardian");
  const [organizationName, setOrganizationName] = useState(existing?.organizationName ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (kind === "school" && !organizationName.trim()) return setError("School / organisation name is required.");
    setLoading(true);
    try {
      const res = await fetch("/api/gicn/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, organizationName: organizationName.trim() || undefined, phone: phone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your profile.");
      router.push(kind === "school" ? "/gicn/school/bulk" : "/gicn/participants");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setKind("guardian")}
          className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${kind === "guardian" ? "border-accent bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
        >
          <Users size={20} className={kind === "guardian" ? "text-accent" : "text-slate-400"} />
          <span className="text-sm font-semibold text-ink">Parent / Guardian</span>
          <span className="text-xs text-slate-500">Register your own children</span>
        </button>
        <button
          type="button"
          onClick={() => setKind("school")}
          className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${kind === "school" ? "border-accent bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
        >
          <School size={20} className={kind === "school" ? "text-accent" : "text-slate-400"} />
          <span className="text-sm font-semibold text-ink">School partner</span>
          <span className="text-xs text-slate-500">Bulk-register students</span>
        </button>
      </div>

      {kind === "school" && (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">School / organisation name <span className="text-red-500">*</span></label>
          <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none" placeholder="e.g. Bright Future Academy" />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Phone <span className="font-normal text-slate-400">(optional)</span></label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-accent focus:bg-white focus:outline-none" placeholder="+234…" />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <Button size="lg" variant="primary" disabled={loading}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : existing ? "Save profile" : "Continue"}
      </Button>
    </form>
  );
}
