"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, MessageSquarePlus } from "lucide-react";

interface Note {
  id: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

interface Props {
  referenceId: string;
  initialNotes: Note[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function NotesPanel({ referenceId, initialNotes }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cases/${referenceId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add note.");
      setNotes((prev) => [data, ...prev]);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add an internal note (visible to admins only)…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <MessageSquarePlus size={13} />}
          {loading ? "Adding…" : "Add note"}
        </button>
      </form>

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.body}</p>
              <p className="mt-1 text-xs text-slate-500">{n.authorEmail} · {fmt(n.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}

      {notes.length === 0 && (
        <p className="text-xs text-slate-400">No internal notes yet.</p>
      )}
    </div>
  );
}
