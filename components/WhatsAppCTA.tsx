"use client";

import { useState } from "react";
import { MessageCircle, X, Phone, Mail } from "lucide-react";

const WA_NUMBER = "2349039586647";
const WA_MESSAGE = encodeURIComponent(
  "Hello MajorGBN, I'm interested in your forensic bank charges recovery service. Please advise on next steps."
);

export default function WhatsAppCTA() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {expanded && (
        <div className="w-64 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden transition-all duration-200">
          <div className="bg-slate-900 px-4 py-3">
            <p className="text-xs font-bold text-white">Contact MajorGBN</p>
            <p className="text-xs text-slate-400">Confidential. Typically responds in 2 hours.</p>
          </div>
          <div className="p-3 space-y-2">
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#20b757] transition-colors"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
            <a
              href="tel:+2349039586647"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Phone size={18} className="text-blue-700" />
              Call Us Directly
            </a>
            <a
              href="mailto:forensics@majormaestro.com"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Mail size={18} className="text-blue-700" />
              Send Email
            </a>
          </div>
          <div className="border-t border-slate-100 px-4 py-2">
            <p className="text-center text-xs text-slate-400">All communications are protected by NDA</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Close contact menu" : "Open contact menu"}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${expanded ? "bg-slate-800 text-white rotate-0" : "bg-[#25D366] text-white hover:scale-110"}`}
      >
        {expanded ? <X size={22} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}
