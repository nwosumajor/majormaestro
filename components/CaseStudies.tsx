import { BadgeCheck, Clock, Banknote, Building2 } from "lucide-react";

const CASES = [
  {
    industry: "Manufacturing",
    turnover: "₦1.2B annual turnover",
    banks: 2,
    chargeTypes: ["Excess COT", "Overdraft interest above MPR cap"],
    recovered: "₦31.4M",
    timeline: "10 weeks",
    detail:
      "A Lagos-based industrial manufacturer had maintained two banking relationships for 7 years. Our forensic team identified COT applied at 0.45% — four times the CBN approved rate of 0.1%. Combined with overdraft interest exceeding the MPR+7% ceiling, the total recovery exceeded ₦31M across both banks.",
  },
  {
    industry: "FMCG Distribution",
    turnover: "₦450M annual turnover",
    banks: 1,
    chargeTypes: ["Inflated LC confirmation charges", "Phantom SWIFT fees"],
    recovered: "₦8.7M",
    timeline: "7 weeks",
    detail:
      "An Abuja-based FMCG distributor with significant import activity was charged LC confirmation fees of up to 3% per quarter — double the CBN maximum of 1.5%. Additionally, SWIFT transfer fees above the $25 flat cap were charged on 94 separate transactions over 4 years, yielding a combined recovery of ₦8.7M.",
  },
  {
    industry: "Construction & Engineering",
    turnover: "₦680M annual turnover",
    banks: 3,
    chargeTypes: ["Term loan interest overcharge", "Facility management fees"],
    recovered: "₦15.2M",
    timeline: "9 weeks",
    detail:
      "A Port Harcourt construction group had three banking relationships involving term loans and contract financing. Our analysis revealed interest rates on two facilities that exceeded the agreed spread over MPR, compounded over 5 years. Facility annual review fees were charged at ₦150,000 per facility versus the CBN cap of ₦10,000.",
  },
  {
    industry: "Healthcare Group",
    turnover: "₦2.1B annual turnover",
    banks: 4,
    chargeTypes: ["Aggregate COT overcharge", "Excess credit risk premium", "Account maintenance"],
    recovered: "₦67.8M",
    timeline: "14 weeks",
    detail:
      "A multi-state private healthcare group with four banking relationships and high transaction volumes. COT charges were consistently applied above CBN rates across all accounts. Credit risk premiums exceeding the 2% p.a. cap were applied on two facilities. This engagement produced the largest single recovery in our portfolio to date.",
  },
];

const COLORS = [
  "border-blue-200 bg-blue-50",
  "border-emerald-200 bg-emerald-50",
  "border-amber-200 bg-amber-50",
  "border-blue-200 bg-blue-50",
];

const ICON_COLORS = ["text-blue-700 bg-blue-100", "text-emerald-700 bg-emerald-100", "text-amber-700 bg-amber-100", "text-blue-700 bg-blue-100"];

export default function CaseStudies() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {CASES.map((c, i) => (
        <div key={i} className={`rounded-2xl border p-6 ${COLORS[i % COLORS.length]}`}>
          <div className="mb-4 flex items-start justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_COLORS[i % ICON_COLORS.length]}`}>
              <Building2 size={20} />
            </div>
            <span className="rounded-full bg-white/80 border border-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
              {c.industry}
            </span>
          </div>

          <p className="mb-1 text-xs font-medium text-slate-500">{c.turnover} · {c.banks} bank{c.banks > 1 ? "s" : ""} audited</p>

          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Banknote size={16} className="text-emerald-600" />
              <span className="text-xl font-black text-emerald-700">{c.recovered}</span>
            </div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Clock size={13} />{c.timeline}
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-slate-700">{c.detail}</p>

          <div className="flex flex-wrap gap-1.5">
            {c.chargeTypes.map((ct) => (
              <span key={ct} className="flex items-center gap-1 rounded-full bg-white/70 border border-white px-2.5 py-1 text-xs font-medium text-slate-600">
                <BadgeCheck size={11} className="text-emerald-500" />{ct}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
