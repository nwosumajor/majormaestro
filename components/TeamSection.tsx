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
    bio: "A forensic banking specialist and former Forensic Auditor at a tier-1 Nigerian bank, Ayodele has led recoveries totalling over ₦400M across 60+ corporate organisations. His expertise spans SWIFT and UCP600 documentary-credit review, recovery of excess LC and trade-finance charges, AML/CFT compliance, and complex bank dispute resolution — all grounded in the CBN and BOFIA regulatory framework and Nigeria's consumer-protection rules. Every engagement is handled personally, under strict confidentiality (NDA-backed, NDPA 2023 compliant) and on a pure success-fee basis: if nothing is recovered, you pay nothing.",
    headshot: "/team/ayodele-nwosu.jpg",
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
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Forensic Leadership</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The team recovering your money
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
            Chartered accountants, trade-finance specialists and regulatory counsel — the credentials
            that let us hold banks to the CBN and BOFIA standard on your behalf.
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
            <div key={m.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {m.headshot ? (
                <Image
                  src={m.headshot}
                  alt={m.name}
                  width={56}
                  height={56}
                  className="mb-4 h-14 w-14 rounded-full object-cover ring-2 ring-emerald-400/40"
                />
              ) : (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-950 text-lg font-black text-emerald-400">
                  {m.name.replace(/[[\]]/g, "").trim().charAt(0) || "?"}
                </div>
              )}
              <h3 className="text-base font-bold text-slate-900">{m.name}</h3>
              <p className="text-sm font-semibold text-blue-800">{m.title}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.credentials.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Award size={10} />{c}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{m.bio}</p>
              {m.linkedin && (
                <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                  <ExternalLink size={13} /> LinkedIn
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Contact card */}
        <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <a href={`mailto:${CONTACT.email.replace(/[[\]]/g, "")}`} className="flex items-start gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</p>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 break-all">{CONTACT.email}</p>
              </div>
            </a>
            <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone</p>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{CONTACT.phone}</p>
              </div>
            </a>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
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
