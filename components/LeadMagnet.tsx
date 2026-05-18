"use client";

import { useState } from "react";
import { BookOpen, Mail, CheckCircle2, Loader2, AlertCircle, Download } from "lucide-react";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, companyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-950 to-slate-900 p-8 shadow-xl">
      <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center">
        {/* Left: copy */}
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
            <BookOpen size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white">
            Free Guide: The Corporate Treasurer&apos;s Handbook
          </h3>
          <p className="mt-2 text-sm text-blue-200">
            <span className="font-semibold text-white">10 Signs Your Bank Is Overcharging You</span> — and what to do about it. Written for Nigerian CFOs, treasurers, and finance directors.
          </p>
          <ul className="mt-5 space-y-2.5">
            {[
              "How to read your bank's charge schedule against CBN rates",
              "The 6 charge types most commonly applied above CBN limits",
              "How to calculate your potential recovery exposure in 10 minutes",
              "The exact CBN complaint process — step by step",
              "What to say to your relationship manager (and what not to say)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-blue-100">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form */}
        <div className="mt-8 lg:mt-0">
          {success ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center">
              <Download size={36} className="mx-auto mb-3 text-emerald-400" />
              <p className="text-lg font-bold text-white">Guide Sent!</p>
              <p className="mt-1 text-sm text-blue-200">Check your inbox. The guide is on its way to <span className="font-semibold text-white">{email}</span>.</p>
              <p className="mt-4 text-xs text-blue-400">Not in your inbox? Check your spam folder or contact forensics@majormaestro.com</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="mb-1 text-sm font-bold text-white">Get the Free Guide</p>
              <p className="mb-5 text-xs text-blue-300">No spam. One email with the guide. Unsubscribe any time.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-blue-200">Company Name <span className="font-normal text-blue-400">(optional)</span></label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Industries Ltd"
                    className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-blue-400 focus:border-emerald-400 focus:bg-white/15 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-blue-200">Official Email Address <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cfo@company.com"
                      className="w-full rounded-xl border border-white/10 bg-white/10 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-blue-400 focus:border-emerald-400 focus:bg-white/15 focus:outline-none transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    <AlertCircle size={13} className="shrink-0" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading || !email} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {loading ? "Sending…" : "Send Me the Free Guide"}
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-blue-500">Your data is protected under NDPA 2023. We never share or sell contact information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
