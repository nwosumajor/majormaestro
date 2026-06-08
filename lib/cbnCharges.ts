/**
 * Single source of truth for CBN charge benchmarks used across the platform
 * (the CBN Rate Checker, the AI pre-screener, sector pages, case studies).
 *
 * IN-FORCE basis: "Guide to Charges by Banks, Other Financial and Non-Bank
 * Financial Institutions" — effective 1 January 2020 (GBC 2020), Part 2 (Banks).
 * Section numbers below cite GBC 2020. `draft2026` notes the 2026 Exposure Draft
 * (NOT yet in force) where it would change a value.
 *
 * Pure data + helpers — no Node-only imports, safe to import in client components.
 *
 * NOTE: indicative benchmarks only; a full forensic audit against the customer's
 * statements and facility letters is definitive. Not legal advice.
 */

export type ChargeStatus = "in_force" | "historical" | "abolished";

/** How the benchmark is checked against a user-supplied figure. */
export type CheckKind =
  | "rate_max" // a single % ceiling (compare charged % ≤ max)
  | "flat_max" // a single ₦/$ ceiling
  | "negotiable" // no fixed cap — overcharge = charged above the agreed/contractual rate
  | "cost_recovery" // pass-through cost (+ optional capped commission %)
  | "tiered" // depends on band/tenor — see `notes`
  | "historical"; // not a current charge; recovery only for periods when it applied

export interface CbnCharge {
  id: string;
  label: string;
  category: "account" | "lending" | "trade" | "fx" | "electronic" | "cards";
  status: ChargeStatus;
  kind: CheckKind;
  /** Human description of how the charge is applied / the recoverable basis. */
  basis: string;
  /** Human "CBN-approved maximum / rule" text (GBC 2020). */
  ceiling: string;
  /** Numeric ceiling for the live checker, when `kind` is rate_max/flat_max/cost_recovery. */
  ceilingValue?: number;
  unit?: string;
  inputSuffix?: string;
  inputPlaceholder?: string;
  /** GBC 2020 section reference. */
  section: string;
  /** Forward-looking note from the 2026 Exposure Draft (not yet in force). */
  draft2026?: string;
  notes?: string;
}

export const CBN_GUIDE_LABEL = "CBN Guide to Charges 2020 (in force)";

export const CBN_CHARGES: CbnCharge[] = [
  {
    id: "camf",
    label: "Current Account Maintenance Fee (CAMF)",
    category: "account",
    status: "in_force",
    kind: "rate_max",
    basis:
      "Current accounts ONLY, on customer-induced debit transactions to third parties and transfers/lodgments to the customer's account in another bank. NOT applicable to savings accounts, bank-induced debits, or transfers to the customer's own account in the same bank.",
    ceiling: "Maximum ₦1 per mille (0.1%) of the qualifying debit value",
    ceilingValue: 0.1,
    unit: "% of qualifying debit value",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 0.25",
    section: "GBC 2020 §3.1",
    draft2026: "2026 Draft reduces this to ₦0.5/mille (0.05%) in 2026 and ₦0 from 2027.",
  },
  {
    id: "loan_interest",
    label: "Loan / Overdraft Interest Rate",
    category: "lending",
    status: "in_force",
    kind: "negotiable",
    basis:
      "Negotiable, anchored to MPR and risk-based — there is NO fixed CBN ceiling. An overcharge arises where the bank charges ABOVE the contractually agreed rate, fails to give 10 business days' notice before a rate change, or charges interest on an unauthorised overdraft (not permissible).",
    ceiling: "Negotiable (anchored to MPR, risk-based) — no fixed cap",
    section: "GBC 2020 §2.1.1 & §2.1.4",
    draft2026: "2026 Draft requires all interest to be quoted as an all-in Annual Percentage Rate (APR).",
    notes:
      "Compare the rate actually charged against the rate in the offer/facility letter. There is no 'MPR + 7%' ceiling in the Guide.",
  },
  {
    id: "penal_rate_naira",
    label: "Penal Rate (Naira facilities)",
    category: "lending",
    status: "in_force",
    kind: "rate_max",
    basis:
      "Charged on the past-due/unpaid amount, IN ADDITION to the current rate of interest, for late repayment / excess over authorised limit. A 7-day grace period applies before any penal charge.",
    ceiling: "Maximum 1% flat per month of the unpaid amount",
    ceilingValue: 1,
    unit: "% flat per month",
    inputSuffix: "% /mo",
    inputPlaceholder: "e.g. 2",
    section: "GBC 2020 §2.1.9",
  },
  {
    id: "penal_rate_fx",
    label: "Penal Rate (Foreign-currency facilities)",
    category: "lending",
    status: "in_force",
    kind: "rate_max",
    basis: "On past-due FX loans/advances, in addition to the current interest rate. 7-day grace.",
    ceiling: "Maximum 0.25% flat per month of the unpaid amount",
    ceilingValue: 0.25,
    unit: "% flat per month",
    inputSuffix: "% /mo",
    inputPlaceholder: "e.g. 0.5",
    section: "GBC 2020 §2.1.9",
  },
  {
    id: "lending_fees_total",
    label: "Total Lending Fees (aggregate)",
    category: "lending",
    status: "in_force",
    kind: "rate_max",
    basis:
      "The aggregate of all lending fees (management + enhancement + other related, all one-off) on a facility. Management fee alone is max 1% of principal; restructuring max 0.5%; commitment max 1% of the undisbursed amount.",
    ceiling: "Total lending fees shall not exceed 2% (one-off)",
    ceilingValue: 2,
    unit: "% of principal (aggregate)",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 3.5",
    section: "GBC 2020 §2.2",
    notes: "There is no recurring 'annual facility review fee' in the Guide — a recurring review fee is itself an overcharge.",
  },
  {
    id: "lc_establishment",
    label: "LC Establishment Commission",
    category: "trade",
    status: "in_force",
    kind: "tiered",
    basis: "Commission for establishing a Letter of Credit, on the period of validity of the credit.",
    ceiling: "≤180 days: 1% · ≤270 days: 1.25% · ≤360 days: 1.5% of face value",
    ceilingValue: 1.5,
    unit: "% of LC face value (by tenor)",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 2.5",
    section: "GBC 2020 §8.7",
    draft2026: "2026 Draft caps LC establishment at a maximum of 0.5% of face value.",
    notes: "This is NOT a per-quarter charge. Use 1% (≤180d), 1.25% (≤270d) or 1.5% (≤360d) for the relevant tenor.",
  },
  {
    id: "lc_confirmation",
    label: "LC Confirmation Commission",
    category: "trade",
    status: "in_force",
    kind: "rate_max",
    basis: "Commission for confirming a Letter of Credit.",
    ceiling: "Minimum ₦5,000, maximum 0.5% of face value",
    ceilingValue: 0.5,
    unit: "% of LC face value",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 1.5",
    section: "GBC 2020 §8.3",
  },
  {
    id: "swift_outward",
    label: "Outward SWIFT / Telegraphic Transfer",
    category: "fx",
    status: "in_force",
    kind: "cost_recovery",
    basis:
      "Actual SWIFT cost (cost recovery) PLUS a commission of max 0.5% on the transfer, plus associated offshore bank charges. There is NO flat '$25' SWIFT cap in the Guide.",
    ceiling: "Cost recovery + max 0.5% commission (+ offshore charges)",
    ceilingValue: 0.5,
    unit: "% commission on transfer value",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 1.2",
    section: "GBC 2020 §5.6",
  },
  {
    id: "domiciliary_withdrawal",
    label: "Domiciliary Account Withdrawal Commission",
    category: "fx",
    status: "in_force",
    kind: "rate_max",
    basis: "Commission on withdrawals from domiciliary accounts (savings or current).",
    ceiling: "0.05% of transaction value or US$10, whichever is LOWER",
    ceilingValue: 0.05,
    unit: "% of transaction value",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 0.2",
    section: "GBC 2020 §5.8",
  },
  {
    id: "bonds_guarantees",
    label: "Bonds / Guarantees / APG Commission",
    category: "lending",
    status: "in_force",
    kind: "rate_max",
    basis: "Bid/performance bonds, advance payment & bank guarantees, indemnities — on contingent liabilities.",
    ceiling: "Maximum 1% of value (first year), 0.5% on subsequent years",
    ceilingValue: 1,
    unit: "% of value (first year)",
    inputSuffix: "%",
    inputPlaceholder: "e.g. 2",
    section: "GBC 2020 §4",
  },
  {
    id: "eft",
    label: "Electronic Funds Transfer (EFT)",
    category: "electronic",
    status: "in_force",
    kind: "tiered",
    basis: "Per electronic transfer, by amount band. Intra-bank transfers are free.",
    ceiling: "<₦5,000: ₦10 · ₦5,001–₦50,000: ₦25 · >₦50,000: ₦50 (RTGS: ₦950)",
    section: "GBC 2020 §10.2",
    draft2026: "2026 Draft: ≤₦5,000 free · ₦5,001–₦50,000: ₦10 · >₦50,000: ₦50.",
  },
  {
    id: "atm_not_on_us",
    label: "ATM Withdrawal (other bank's ATM)",
    category: "electronic",
    status: "in_force",
    kind: "flat_max",
    basis: "'Not-on-us' withdrawals (another bank's ATM) in Nigeria. On-us (own bank) withdrawals are free.",
    ceiling: "₦35 after the 3rd withdrawal within the same month (first 3 free)",
    ceilingValue: 35,
    unit: "₦ per withdrawal (after 3rd/month)",
    inputSuffix: "₦",
    inputPlaceholder: "e.g. 100",
    section: "GBC 2020 §10.7.2",
    draft2026: "2026 Draft moves to ₦100 per ₦20,000 (on-site) plus a disclosed surcharge of ≤₦500/₦20,000 (off-site).",
  },
  {
    id: "returned_cheque",
    label: "Returned Cheque / Failed Direct Debit (unfunded)",
    category: "account",
    status: "in_force",
    kind: "flat_max",
    basis: "Where due to the account being unfunded — borne by the drawer only.",
    ceiling: "1% of the amount or ₦5,000, whichever is HIGHER",
    section: "GBC 2020 §11.5.2 / §9.7.2",
  },
  {
    id: "cot",
    label: "Commission on Turnover (COT) — historical",
    category: "account",
    status: "abolished",
    kind: "historical",
    basis:
      "COT was phased out and ABOLISHED (last applicable ~2016) and replaced by CAMF. It is NOT a charge under the 2020 Guide. Excess COT is recoverable ONLY for historical periods when it actually applied.",
    ceiling: "Not a current charge. Historical stepdown: ₦5 → ₦3 (2013) → ₦2 (2014) → ₦1 (2015) → ₦0 (2016) per mille",
    section: "Pre-2016 CBN circulars (not in GBC 2020)",
    notes: "For a current account-turnover overcharge, benchmark against CAMF (§3.1), not COT.",
  },
];

export function getCharge(id: string): CbnCharge | undefined {
  return CBN_CHARGES.find((c) => c.id === id);
}

/** Charges that the live numeric checker can evaluate against a single % / flat ceiling. */
export function numericCheckableCharges(): CbnCharge[] {
  return CBN_CHARGES.filter((c) => c.ceilingValue !== undefined && c.status === "in_force");
}

/**
 * Reference block injected into the AI pre-screener prompt. Generated from the
 * dataset so the AI and the Rate Checker never drift apart.
 */
export function cbnReferenceForAI(): string {
  const lines = CBN_CHARGES.map((c) => {
    const tag = c.status === "in_force" ? "" : ` [${c.status.toUpperCase()}]`;
    return `- ${c.label}${tag}: ${c.ceiling}. Basis: ${c.basis} (${c.section}).`;
  });
  return [
    "CBN charge benchmarks — Guide to Charges 2020 (in force). Use ONLY these; do not invent ceilings.",
    ...lines,
    "",
    "Critical accuracy rules:",
    "- COT is ABOLISHED (replaced by CAMF in ~2016). Only flag COT for clearly historical (pre-2016) periods; otherwise benchmark account-turnover charges against CAMF.",
    "- Loan/overdraft interest is NEGOTIABLE — there is NO 'MPR + 7%' cap. An interest overcharge means a rate charged ABOVE the agreed facility-letter rate, missing 10-day rate-change notice, or interest on an unauthorised overdraft.",
    "- There is NO flat '$25' SWIFT cap (SWIFT = cost recovery + max 0.5% commission) and NO recurring 'annual facility review fee' (lending fees are one-off, aggregate ≤2%).",
    "- LC confirmation max is 0.5% of face value; LC establishment is 1%/1.25%/1.5% by tenor (NOT per quarter).",
    "- Be specific and cite the charge type. If a figure is within limits, say so. Flag only genuine, Guide-based overcharges.",
  ].join("\n");
}
