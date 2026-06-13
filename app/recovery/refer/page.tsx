"use client";

import { useState } from "react";
import { Gift, Copy, CheckCircle2, Users, TrendingUp, Shield, ArrowRight, Mail, MessageCircle, Loader2, AlertCircle } from "lucide-react";

const BENEFITS = [
  { pct: "₦50K–₦200K", desc: "tiered bonus for every referral that completes a forensic audit — regardless of outcome — scaled to the company's annual turnover" },
  { pct: "5%", desc: "of the recovered amount on every successful recovery, paid on completion — on top of the bonus" },
  { pct: "No cap", desc: "unlimited referrals, no minimum threshold, paid by bank transfer within 5 business days" },
];

// Bonus scales with the referred organisation's annual turnover — larger
// businesses (and high-volume LC / trade-finance importers) carry more
// recoverable excess. Mirrors BONUS_TIERS_KOBO in lib/referrals.ts.
const BONUS_TIERS = [
  { band: "₦5M – ₦49M", bonus: "₦50,000" },
  { band: "₦50M – ₦200M", bonus: "₦75,000" },
  { band: "₦200M – ₦1B", bonus: "₦100,000" },
  { band: "₦1B+ · high-volume / LC trade finance", bonus: "₦200,000" },
];

const HOW: { step: string; title: string; desc: string }[] = [
  { step: "01", title: "Generate Your Link", desc: "Enter your name and email below. We generate a unique, tracked referral link for you instantly." },
  { step: "02", title: "Share With Your Network", desc: "Send the link to any Nigerian company CFO, finance director, or treasurer who banks locally. No formal introduction needed." },
  { step: "03", title: "We Handle Everything", desc: "Once they lodge a complaint via your link, our forensics team manages the entire recovery process from audit to settlement." },
  { step: "04", title: "You Earn", desc: "Your commission is calculated at the point of recovery confirmation. Payment is made by bank transfer within 5 business days." },
];

export default function ReferPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [refLink, setRefLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate referral link.");
      setRefLink(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate referral link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* noop */
    }
  }

  const waText = encodeURIComponent(`Hello, MajorGBN helped us recover excess bank charges. If your company banks in Nigeria, check if you're owed money too: ${refLink}`);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-950 px-6 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Gift size={28} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">Referral Programme</h1>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">
            Know a company that might be overpaying their bank? Refer them to MajorGBN and earn a commission on every successful recovery — with no cap on earnings.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-14 space-y-14">

        {/* Commission tiers */}
        <section>
          <h2 className="mb-6 text-center text-xl font-black text-slate-900">What You Earn</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <div key={i} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-3xl font-black text-emerald-700">{b.pct}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
          {/* Bonus tier breakdown */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-sm font-bold text-slate-900">Bonus by referred company size</p>
              <p className="text-xs text-slate-500">Paid once their forensic audit completes — win or lose.</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {BONUS_TIERS.map((t) => (
                  <tr key={t.band}>
                    <td className="px-5 py-3 text-slate-700">{t.band}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-700">{t.bonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">Plus 5% of the recovered amount on every successful recovery. Commissions are subject to MajorGBN&apos;s standard referral agreement. No minimum threshold. No cap.</p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="mb-6 text-center text-xl font-black text-slate-900">How It Works</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {HOW.map((h) => (
              <div key={h.step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-sm font-black text-white">{h.step}</span>
                <div>
                  <p className="font-bold text-slate-900">{h.title}</p>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Generate link */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Generate Your Referral Link</h2>
                <p className="text-sm text-slate-500">Takes 10 seconds. No account required.</p>
              </div>
            </div>

            {!refLink ? (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Aisha Bello"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Your Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    />
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                  {loading ? "Generating…" : "Generate My Referral Link"}
                </button>
              </form>
            ) : (
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Your unique referral link:</p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 font-mono text-xs text-slate-700 break-all">
                    {refLink}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${copied ? "bg-emerald-500 text-white" : "border-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <p className="mt-4 mb-3 text-sm font-semibold text-slate-700">Share directly:</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20b757] transition-colors"
                  >
                    <MessageCircle size={15} /> Share on WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=Your%20company%20may%20be%20owed%20money%20by%20your%20bank&body=${encodeURIComponent(`Hi,\n\nMajorGBN recovers excess bank charges from Nigerian commercial banks under CBN/BOFIA regulations.\n\nIf your company has been banking for 2+ years, you may be owed significant funds.\n\nCheck your eligibility here: ${refLink}\n\nBest,\n${name}`)}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Mail size={15} /> Share via Email
                  </a>
                </div>

                <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <TrendingUp size={14} className="mt-0.5 shrink-0 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    We track all referrals using your link. You&apos;ll receive a commission statement by email once a case is successfully resolved. For enquiries, email <a href="mailto:referrals@majormaestro.com" className="font-semibold underline">referrals@majormaestro.com</a>.
                  </p>
                </div>

                {(() => {
                  let code = "";
                  try { code = new URL(refLink).searchParams.get("ref") ?? ""; } catch { /* noop */ }
                  if (!code) return null;
                  return (
                    <a
                      href={`/recovery/refer/${code}`}
                      className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <span>Track your referrals on your private dashboard →</span>
                      <span className="font-mono text-xs">{code}</span>
                    </a>
                  );
                })()}

                <button
                  onClick={() => { setRefLink(""); setName(""); setEmail(""); }}
                  className="mt-4 text-xs text-slate-400 underline hover:text-slate-600"
                >
                  Generate a different link
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Trust signals */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Shield, title: "NDA Protected", desc: "All referrals are handled under strict confidentiality. Your contacts' information is never shared." },
            { icon: CheckCircle2, title: "No Risk to Referees", desc: "Referred companies are under no obligation. They decide if and when to proceed with an audit." },
            { icon: ArrowRight, title: "Immediate Activation", desc: "Your referral link is live as soon as it is generated. No approval process required." },
          ].map((t, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <t.icon size={18} className="mt-0.5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-bold text-slate-800">{t.title}</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Programme terms */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">Programme Terms</h2>
          <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
            <li>• <span className="font-semibold text-slate-700">What you earn:</span> a tiered bonus of ₦50,000–₦200,000 for every referral that completes a forensic audit (regardless of outcome), scaled to the referred company&apos;s annual turnover, plus 5% of the recovered amount on successful recoveries.</li>
            <li>• <span className="font-semibold text-slate-700">Attribution:</span> a referral is credited when a company lodges a complaint via your link. Credit lasts 90 days from the click; you can&apos;t refer your own company.</li>
            <li>• <span className="font-semibold text-slate-700">Payment:</span> rewards are paid after the referred recovery completes and funds are received. You must confirm your email and provide payout details before payment is released.</li>
            <li>• <span className="font-semibold text-slate-700">Confidentiality:</span> all referrals are handled under NDA and the Nigeria Data Protection Act 2023. Referred companies are under no obligation.</li>
            <li>• MajorGBN may vary or end the programme; accrued rewards on referrals already in progress are honoured.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
