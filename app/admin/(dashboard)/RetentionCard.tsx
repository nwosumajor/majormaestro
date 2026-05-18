"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Trash2, Loader2, AlertCircle, ScrollText } from "lucide-react";

interface DocPreview {
  retentionDays: number;
  cutoff: string;
  eligibleCases: number;
  eligibleDocuments: number;
}

interface AuditPreview {
  retentionDays: number;
  cutoff: string;
  eligibleEntries: number;
}

export default function RetentionCard() {
  const router = useRouter();
  const [docPreview, setDocPreview] = useState<DocPreview | null>(null);
  const [auditPreview, setAuditPreview] = useState<AuditPreview | null>(null);
  const [busy, setBusy] = useState<"docs" | "audit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPreviews() {
    try {
      const [docRes, auditRes] = await Promise.all([
        fetch("/api/admin/retention/purge").then((r) => r.json()),
        fetch("/api/admin/retention/audit/purge").then((r) => r.json()),
      ]);
      if (!docRes.error) setDocPreview(docRes);
      if (!auditRes.error) setAuditPreview(auditRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load previews.");
    }
  }

  useEffect(() => { loadPreviews(); }, []);

  async function purgeDocs() {
    if (!docPreview || docPreview.eligibleDocuments === 0) return;
    if (!confirm(`Permanently delete ${docPreview.eligibleDocuments} document(s) from ${docPreview.eligibleCases} closed case(s)? This cannot be undone.`)) return;
    setBusy("docs");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/retention/purge", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purge failed.");
      setMessage(`Purged ${data.deletedDocuments} document records (${data.deletedBlobs} blobs, ${data.failedBlobs} failures).`);
      await loadPreviews();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purge failed.");
    } finally {
      setBusy(null);
    }
  }

  async function purgeAudit() {
    if (!auditPreview || auditPreview.eligibleEntries === 0) return;
    if (!confirm(`Permanently delete ${auditPreview.eligibleEntries} audit-log entrie(s) older than ${auditPreview.retentionDays} days? This cannot be undone.`)) return;
    setBusy("audit");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/retention/audit/purge", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purge failed.");
      setMessage(`Purged ${data.deletedEntries} audit log entries.`);
      await loadPreviews();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purge failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
          <CalendarClock size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">Document retention</p>
          {docPreview ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {docPreview.retentionDays} days after case close.
              {docPreview.eligibleDocuments > 0
                ? <> <span className="font-bold text-rose-700">{docPreview.eligibleDocuments}</span> document{docPreview.eligibleDocuments === 1 ? "" : "s"} eligible.</>
                : <> Nothing eligible.</>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">Loading…</p>
          )}
          <button
            onClick={purgeDocs}
            disabled={busy === "docs" || !docPreview || docPreview.eligibleDocuments === 0}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy === "docs" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Purge documents
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-slate-100 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <ScrollText size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">Audit log retention</p>
          {auditPreview ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {auditPreview.retentionDays} days.
              {auditPreview.eligibleEntries > 0
                ? <> <span className="font-bold text-amber-700">{auditPreview.eligibleEntries}</span> entr{auditPreview.eligibleEntries === 1 ? "y" : "ies"} eligible.</>
                : <> Nothing eligible.</>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">Loading…</p>
          )}
          <button
            onClick={purgeAudit}
            disabled={busy === "audit" || !auditPreview || auditPreview.eligibleEntries === 0}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy === "audit" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Purge audit log
          </button>
        </div>
      </div>

      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-700">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}
