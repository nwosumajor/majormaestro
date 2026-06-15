import Image from "next/image";
import { Award, Mail, Phone, MapPin, ExternalLink } from "lucide-react";

/**
 * Forensic team credentials + contact section for the recovery landing page.
 *
 * ⚠️ PLACEHOLDER CONTENT — replace the bracketed values in TEAM and CONTACT with
 * the real team members (names, titles, professional credentials such as
 * ICAN/ACCA/CFE/CISA) and the firm's real contact details before launch.
 */

interface TeamMember {
  name: string;
  title: string;
  credentials: string[];
  bio: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  headshot?: string;
}

const TEAM: TeamMember[] = [
  {
    name: "Ayodele O. Nwosu",
    title: "Managing Partner",
    credentials: [
      "Audit & Forensic Banking",
      "AML/CFT Compliance",
      "Fundamentals of Banking",
      "PMP",
      "HSE",
    ],
    bio: "Former tier-1 bank Forensic Auditor with ₦400M+ recovered across 60+ organisations. Specialist in LC & trade-finance charges (SWIFT/UCP600), AML/CFT and bank disputes — grounded in CBN/BOFIA. Every case is confidential and success-fee only.",
  },
  {
    name: "Obe Adeolu Azeez",
    title: "Principal Partner, Sales & Marketing Division",
    credentials: [
      "Sales & Marketing",
      "Lead Generation",
      "Customer Acquisition",
      "Market Research",
      "Mass Communication",
    ],
    bio: "Results-driven sales and marketing professional pairing a Mass Communication background with hands-on expertise in lead generation, customer acquisition and market research — driving client outreach and growth across the firm's recovery services.",
    email: "obeydexy@gmail.com",
    phone: "+234 705 752 2708",
  },
  {
    name: "Owoicho Christopher Emmanuel",
    title: "Principal Consultant, Logistics & General Supplies Division",
    credentials: [
      "Logistics",
      "Supply Chain",
      "Procurement",
      "Vendor Management",
      "General Supplies",
    ],
    bio: "Logistics and supply-chain consultant overseeing procurement, vendor management and general supplies — ensuring the firm's engagements are resourced and delivered efficiently, reliably and cost-effectively.",
    email: "logistics@majormaestro.com",
    phone: "+234 798 143 0152",
  },
  {
    name: "Ejim Joseph",
    title: "Principal Consultant, Legal Division",
    credentials: [
      "Legal Counsel",
      "Regulatory (CBN/BOFIA)",
      "Dispute Resolution",
      "Contracts & NDA",
      "Compliance",
    ],
    bio: "Legal consultant providing regulatory and dispute-resolution counsel across the firm's engagements — anchoring recovery claims in CBN and BOFIA, advising on NDA/NDPA 2023 compliance, and enforcing contractual and bank-engagement positions.",
    email: "legal@majormaestro.com",
    phone: "+234 703 917 9448",
  },
  {
    name: "Egbe Marvelous",
    title: "Principal Consultant, Technology Division",
    credentials: [
      "Software Engineering",
      "Cloud & DevOps",
      "Security & InfoSec",
      "Data Protection",
      "AI Integration",
    ],
    bio: "Technology consultant leading the platform's engineering and security — the secure client portal, AES-encrypted document handling and NDPA-compliant data protection, plus the AI integrations behind staff classification and case analysis.",
    email: "tech@majormaestro.com",
    phone: "+234 808 334 0791",
  },
  {
    name: "Akinnusi Ayobami",
    title: "Principal Manager, Administrative Division",
    credentials: [
      "Administration",
      "Operations",
      "HR & Admin",
      "Office Management",
      "Client Onboarding",
    ],
    bio: "Administrative lead coordinating the firm's operations, client onboarding and internal processes — keeping every engagement organised, responsive and well-documented from first contact through to recovery.",
    email: "admin@majormaestro.com",
    phone: "+234 902 664 6437",
  },
  {
    name: "Osinulu Damilare",
    title: "Principal Consultant, Accounting & Finance Division",
    credentials: [
      "Forensic Auditing",
      "Accounting & Finance",
      "Financial Analysis",
      "Statement Reconciliation",
      "CBN/BOFIA",
    ],
    bio: "Accounting and finance consultant specialising in forensic auditing — reconstructing bank statements, quantifying excess interest, COT and LC charges, and building the evidence base that underpins each recovery claim under CBN and BOFIA.",
    email: "finance@majormaestro.com",
  },
  // Add further team members here (see docs/TEAM-DETAILS-TEMPLATE.md).
];

const CONTACT = {
  email: "forensic@majormaestro.com",
  phone: "+234 903 958 6647",
  address: "Mainland, Lagos, Nigeria",
};

export default function TeamSection() {
  return (
    <section id="team" className="bg-slate-50 py-16 sm:py-24 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Our Leadership Team</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The team behind your recovery
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
            Forensic, advisory, growth and operations leadership — the people and credentials that let us
            hold banks to the CBN and BOFIA standard and deliver every engagement end-to-end.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 gap-6 ${
            TEAM.length === 1
              ? "mx-auto max-w-sm"
              : TEAM.length === 2
                ? "mx-auto max-w-2xl sm:grid-cols-2"
                : "md:grid-cols-3"
          }`}
        >
          {TEAM.map((m) => (
            <div key={m.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {m.headshot ? (
                <Image
                  src={m.headshot}
                  alt={m.name}
                  width={56}
                  height={56}
                  className="mb-4 h-14 w-14 rounded-full object-cover ring-2 ring-emerald-400/40"
                />
              ) : (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-black text-accent-bright">
                  {m.name.replace(/[[\]]/g, "").trim().charAt(0) || "?"}
                </div>
              )}
              <h3 className="text-base font-bold text-slate-900">{m.name}</h3>
              <p className="text-sm font-semibold text-accent">{m.title}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.credentials.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Award size={10} />{c}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{m.bio}</p>
              {(m.email || m.phone) && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-accent break-all">
                      <Mail size={12} className="shrink-0" />{m.email}
                    </a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-accent">
                      <Phone size={12} className="shrink-0" />{m.phone}
                    </a>
                  )}
                </div>
              )}
              {m.linkedin && (
                <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-bright">
                  <ExternalLink size={13} /> LinkedIn
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Contact card */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <a href={`mailto:${CONTACT.email.replace(/[[\]]/g, "")}`} className="flex items-start gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</p>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-accent break-all">{CONTACT.email}</p>
              </div>
            </a>
            <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone</p>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-accent">{CONTACT.phone}</p>
              </div>
            </a>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Office</p>
                <p className="text-sm font-semibold text-slate-800">{CONTACT.address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
