"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
  {
    q: "Is it legal to challenge our bank's charges?",
    a: "Absolutely. The CBN Guide to Bank Charges is a legally binding regulatory instrument under the BOFIA Act 2020. Banks are obligated to charge only within CBN-approved limits. Recovering excess charges is not a dispute — it is the enforcement of a legal entitlement. The CBN Consumer Protection Department actively handles such complaints.",
  },
  {
    q: "Will this damage our banking relationship?",
    a: "This is the most common concern and the answer is almost always no. Banks deal with charge recovery professionally. Our engagement is structured around regulatory compliance, not adversarial litigation. In most cases, the relationship manager is unaware of the overcharges — they originate in automated billing systems. Completing a recovery rarely affects credit access or service levels.",
  },
  {
    q: "What if we are currently applying for a loan or facility?",
    a: "We recommend disclosing this to us at the outset. In most cases, we pause formal bank engagement until your facility is approved or we proceed through a softer channel (written query rather than CBN escalation). We have successfully run concurrent recoveries and loan applications with the same bank — the two processes are handled by entirely different departments.",
  },
  {
    q: "Exactly how is the 30% success fee calculated?",
    a: "Our fee is 30% of the total net cash recovered into your corporate account, applied only after funds are received. If your bank reverses ₦10,000,000 in excess charges, our fee is ₦3,000,000. If we recover nothing, you owe nothing — not even a retainer. There are no hidden charges, no administration fees, and no minimum engagement cost.",
  },
  {
    q: "What happens if the bank disputes our forensic findings?",
    a: "We anticipate this and our Forensic Findings Report is built to withstand challenge. Each identified overcharge is cross-referenced to the specific CBN circular and your account statement. If the bank rejects our findings, we escalate formally to the CBN Consumer Protection Department. The CBN has directed refunds in over 70% of escalated cases where supporting documentation is complete.",
  },
  {
    q: "How far back can we claim excess charges?",
    a: "CBN regulations and the BOFIA Act support recovery of overcharges up to 6 years retrospectively. This is a hard statutory deadline — every month that passes permanently closes one month of recoverable history. If your company has been banking for 6+ years, acting promptly ensures you capture the full window.",
  },
  {
    q: "What documents do we need to provide?",
    a: "The core requirements are: bank statements for the audit period (ideally 3–6 years), any facility letters or loan agreements, and a signed Letter of Authority authorising us to act on your behalf. Additional documents (charge schedules, SWIFT confirmations, LC documentation) can be supplied progressively as the forensic work begins. We provide a full document checklist at engagement.",
  },
  {
    q: "How do you protect our confidential financial data?",
    a: "All data is handled under a mutual NDA executed before any documents are shared. Electronically transmitted documents are encrypted using AES-256. Data is stored in isolated, access-controlled environments. We comply strictly with the Nigeria Data Protection Act (NDPA) 2023 and do not share your information with any third party. Our team operates under strict confidentiality contracts.",
  },
  {
    q: "Can you audit multiple banks simultaneously?",
    a: "Yes. Many of our clients bank with two to five institutions. We audit all relevant banks simultaneously and deliver a consolidated Forensic Findings Report. Each bank is engaged separately, and findings from one bank are never shared with another. This is often where the largest recoveries are made — excess charges frequently occur in identical ways across multiple banking relationships.",
  },
  {
    q: "What size and type of companies have you worked with?",
    a: "We work exclusively with corporate entities — from mid-sized SMEs with ₦50M annual turnover to large conglomerates and listed companies. Our clients span manufacturing, FMCG, construction, healthcare, education, and financial services. We do not work with individual/personal account holders — only registered corporate entities with verifiable RC numbers.",
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-slate-100">
      {FAQS.map(({ q, a }, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-start justify-between gap-4 py-5 text-left hover:text-blue-900 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-900 leading-snug">{q}</span>
            <span className="mt-0.5 shrink-0 text-slate-400">
              {open === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>
          {open === i && (
            <div className="pb-5 pr-8">
              <p className="text-sm leading-relaxed text-slate-600">{a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
