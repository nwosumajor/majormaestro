"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Save, Trash2, ShieldAlert } from "lucide-react";

interface Props {
  initialName: string | null;
  email: string;
  linkedComplaintCount: number;
}

export default function AccountForms({ initialName, email, linkedComplaintCount }: Props) {
  const router = useRouter();

  // Name form
  const [name, setName] = useState(initialName ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  // Delete form
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmStage, setConfirmStage] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameBusy(true);
    setNameError(null);
    setNameMessage(null);
    try {
      const res = await fetch("/api/client/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() === "" ? null : name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setNameMessage("Display name updated.");
      router.refresh();
      setTimeout(() => setNameMessage(null), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setNameBusy(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/client/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete account.");
      // Redirect to home — cookie was cleared server-side
      window.location.href = "/?account_deleted=1";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Display name form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Display name</h2>
        <p className="mt-1 text-xs text-slate-500">Shown in your dashboard header. Leave blank to display only your email.</p>
        <form onSubmit={handleSaveName} className="mt-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Aisha Bello"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          {nameError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />{nameError}
            </div>
          )}
          {nameMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 size={13} className="shrink-0" />{nameMessage}
            </div>
          )}
          <button
            type="submit"
            disabled={nameBusy || name === (initialName ?? "")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            {nameBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {nameBusy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* Danger zone — delete account */}
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <ShieldAlert size={16} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-red-900">Delete account</h2>
            <p className="mt-1 text-xs text-red-800">
              Permanently deletes your account, all saved classifications, and all saved roadmaps. Your{" "}
              <span className="font-semibold">{linkedComplaintCount}</span> recovery case
              {linkedComplaintCount === 1 ? "" : "s"} will be retained for legal compliance but detached from your identity.
            </p>
            <p className="mt-1 text-xs text-red-700">This action cannot be undone.</p>

            {!confirmStage ? (
              <button
                onClick={() => setConfirmStage(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-400 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={12} /> I want to delete my account
              </button>
            ) : (
              <form onSubmit={handleDelete} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-red-900">
                    Type <span className="font-mono">{email}</span> to confirm
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={email}
                    className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                  />
                </div>
                {deleteError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs text-red-700">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />{deleteError}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={deleting || confirmText.toLowerCase() !== email.toLowerCase()}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60 transition-colors"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {deleting ? "Deleting…" : "Permanently delete account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmStage(false); setConfirmText(""); setDeleteError(null); }}
                    className="text-xs text-slate-600 underline hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
