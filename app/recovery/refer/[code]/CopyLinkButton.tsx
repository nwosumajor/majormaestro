"use client";

import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* noop */
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
        copied ? "bg-emerald-500 text-white" : "border-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
