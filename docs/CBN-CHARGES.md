# CBN Charge Benchmarks — Reference

**Operative basis:** *Guide to Charges by Banks, Other Financial and Non-Bank
Financial Institutions* — effective **1 January 2020** ("GBC 2020"), Part 2 (Banks).

**Authoritative source in code:** [`lib/cbnCharges.ts`](../lib/cbnCharges.ts) is the
**single source of truth**. The CBN Rate Checker (`components/CBNRateComparison.tsx`),
the AI pre-screener (`app/api/pre-screen/route.ts`, via `cbnReferenceForAI()`), the
sector pages, the case studies, and the lead-magnet email all derive their figures
from it (or were corrected to match it). **Update `lib/cbnCharges.ts` first**, then
reflect changes here — never hard-code a CBN figure anywhere else.

> ⚠️ These are **indicative benchmarks**, not legal advice. A full forensic audit
> against the customer's bank statements and facility/offer letters is definitive.

---

## Why this document exists

The application's content was previously inconsistent with GBC 2020. The recurring
inaccuracies (all now removed) were:

| Wrong claim (removed) | Correct position (GBC 2020) |
|---|---|
| "COT capped at ₦1/mille" as a **current** charge | **COT was abolished (~2016)** and replaced by **CAMF**. Only recoverable for historical (pre-2016) periods. |
| "Overdraft interest capped at **MPR + 7%**" | Interest is **negotiable** — no fixed ceiling. Overcharge = rate **above the agreed facility-letter rate**, a rate change without 10 business days' notice, or interest on an unauthorised overdraft. |
| "SWIFT fees capped at **$25 flat**" | **Cost recovery + max 0.5% commission** (+ offshore charges). No flat $25 cap. |
| "LC confirmation **1.5% per quarter**" | **Max 0.5%** of face value (one-off). |
| "**Annual facility review fee** capped at ₦10,000" | No recurring review fee exists in the Guide — a **recurring review fee is itself an overcharge**. Lending fees are **one-off, ≤2% aggregate**. |
| "CAMF **per quarter**" | CAMF accrues **per qualifying debit** on **current accounts only**, not as a periodic levy. |

---

## In-force charges (GBC 2020)

| Charge | Ceiling / rule | Section | Basis |
|---|---|---|---|
| **Current Account Maintenance Fee (CAMF)** | Max **₦1/mille (0.1%)** of qualifying debit value | §3.1 | Current accounts only, on customer-induced debits to third parties / transfers to the customer's account at another bank. **Not** savings, **not** bank-induced debits, **not** transfers to the customer's own account in the same bank. |
| **Loan / Overdraft Interest** | **Negotiable** (anchored to MPR, risk-based) — no fixed cap | §2.1.1, §2.1.4 | Overcharge = charged above the agreed offer/facility-letter rate, a rate change without 10 business days' notice, or interest on an unauthorised overdraft. |
| **Penal Rate (Naira facilities)** | Max **1% flat per month** of the unpaid amount | §2.1.9 | On past-due / over-limit amounts, **in addition** to current interest. 7-day grace before any penal charge. |
| **Penal Rate (FX facilities)** | Max **0.25% flat per month** of the unpaid amount | §2.1.9 | As above, for foreign-currency facilities. |
| **Total Lending Fees (aggregate)** | **≤ 2% one-off** of principal | §2.2 | Aggregate of all lending fees. Management fee alone ≤1%; restructuring ≤0.5%; commitment ≤1% of undisbursed amount. No recurring review fee. |
| **LC Establishment Commission** | ≤180d: **1%** · ≤270d: **1.25%** · ≤360d: **1.5%** of face value | §8.7 | By period of validity (tenor). Not per quarter. |
| **LC Confirmation Commission** | Min ₦5,000, **max 0.5%** of face value | §8.3 | Commission for confirming an LC. |
| **Outward SWIFT / Telegraphic Transfer** | **Cost recovery + max 0.5% commission** (+ offshore charges) | §5.6 | Actual SWIFT cost plus ≤0.5% commission. No flat $25 cap. |
| **Domiciliary Account Withdrawal** | **0.05%** of value **or US$10**, whichever is **lower** | §5.8 | Withdrawals from domiciliary accounts (savings or current). |
| **Bonds / Guarantees / APG** | Max **1%** of value (year 1), **0.5%** subsequent years | §4 | Bid/performance bonds, advance-payment & bank guarantees, indemnities. |
| **Electronic Funds Transfer (EFT)** | <₦5,000: **₦10** · ₦5,001–₦50,000: **₦25** · >₦50,000: **₦50** (RTGS: **₦950**) | §10.2 | Per electronic transfer by amount band. Intra-bank transfers are free. |
| **ATM Withdrawal (other bank's ATM)** | **₦35** after the 3rd withdrawal in the same month (first 3 free) | §10.7.2 | "Not-on-us" withdrawals in Nigeria. On-us withdrawals are free. |
| **Returned Cheque / Failed Direct Debit (unfunded)** | **1% or ₦5,000, whichever is higher** | §11.5.2 / §9.7.2 | Where due to an unfunded account; borne by the drawer only. |

## Trade finance, FX & Letters of Credit

Sourced from the **Bankers' Committee (CIBN Sub-committee on Ethics & Professionalism)
framework on unresolved FX-linked obligations, Letters of Credit and Trade Instruments**,
which interprets the operative CBN regulations it cites. These feed the Rate Checker
(as informational rules) and the AI pre-screener, and underpin `/recovery/trade-finance`.

| Item | Rule | Source | Notes |
|---|---|---|---|
| **Interest on LC cash-collateral / cover** (the bank owes *you*) | Bank must pay credit interest of **≥ 30% of MPR** on cash cover held as a special-purpose deposit (locked 7+ days) | Foreign Trade & Exchange Policy Guidelines 2022/2023 §3.2 + Guide to Charges (deposit interest) | Shortfall is **recoverable**, *unless* the collateral was funded by a bank loan. Liened/restricted balances held for extended periods are deemed entitled to interest. |
| **Offshore / correspondent LC charges (SWIFT Field 71D)** | Recoverable from the customer at **actual cost only** — no undisclosed margin | UCP600 (Field 71D) + Consumer Protection Regulation §4 | Field 71D covers advising, reimbursement, amendment, confirmation, negotiation, transfer. Undisclosed mark-ups, or costs defaulted to the applicant without documented instruction, are recoverable. |
| **Confirmation-line & refinancing charges ('pre-/post-negotiation')** | Permissible **only if disclosed & agreed** on the offer letter; no double-charging | Consumer Protection Regulation §4 + UCP600 | "Pre-negotiation"/"post-negotiation" are **not** recognised CBN/UCP600 terms. Margined, undisclosed uses are disputable. |
| **FX differential / penal costs from bank delay** | Customer should **not** bear FX differentials or nostro-overdraft mark-ups caused by the bank's inaction or poor disclosure | Consumer Protection Regulation §§3 & 5 | Bank must evidence genuine FX-sourcing effort and document consent to refinancing. Penal/overdraft costs = actual cost recovery, prorated. |

> **Disclosure principle (Consumer Protection Regulation §4):** a charge that was not
> disclosed and agreed *before* it was applied **cannot be earned** — the backbone of
> every trade-finance recovery above.

---

## Historical (not a current charge)

| Charge | Status | Notes |
|---|---|---|
| **Commission on Turnover (COT)** | **Abolished** (~2016), replaced by CAMF | Historical stepdown: ₦5 → ₦3 (2013) → ₦2 (2014) → ₦1 (2015) → ₦0 (2016) per mille. Excess COT is recoverable **only** for periods when it actually applied. For current account-turnover overcharges, benchmark against **CAMF (§3.1)**. |

---

## 2026 Exposure Draft (NOT in force)

The *Signed Guide to Charges April 2026* is a **draft / exposure document — not yet
operative**. The app continues to benchmark against GBC 2020. The dataset records the
draft deltas in each charge's `draft2026` field for forward planning only:

- **CAMF:** reduced to ₦0.5/mille (0.05%) in 2026, ₦0 from 2027.
- **Loan interest:** must be quoted as an all-in **APR**.
- **LC establishment:** capped at **0.5%** of face value.
- **EFT:** ≤₦5,000 free · ₦5,001–₦50,000 ₦10 · >₦50,000 ₦50.
- **ATM:** ₦100 per ₦20,000 (on-site) + disclosed surcharge ≤₦500/₦20,000 (off-site).

When the 2026 Guide becomes operative, flip the values in `lib/cbnCharges.ts`
(and `CBN_GUIDE_LABEL`), move the superseded GBC 2020 figures into a historical note,
and update this document.

---

## Retrospective recovery window

Overcharges are recoverable retrospectively for up to **6 years** under the **BOFIA
Act 2020**. Banks above the limits — or above a customer's contractually agreed rate —
are in breach, and the excess is recoverable.
