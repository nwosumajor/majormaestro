// Versioned Terms & Conditions / Data Protection Policy for the recovery intake.
// The TermsAcceptance row stores the `version` string (not the prose), so we
// always know which text a customer agreed to even after the policy is revised.
// To publish a revision: add a new version string + sections and bump `version`.
// This file is import-safe on both client and server (no node-only imports).

export interface PolicySection {
  heading: string;
  body: string;
}

export interface RecoveryTermsPolicy {
  version: string;
  effectiveDate: string; // ISO date
  title: string;
  sections: PolicySection[];
}

export const RECOVERY_TERMS: RecoveryTermsPolicy = {
  version: "recovery-tos-v1",
  effectiveDate: "2026-06-15",
  title: "Forensic Recovery Engagement — Terms & Data Protection Policy",
  sections: [
    {
      heading: "1. Data Protection & Privacy",
      body: "You authorise MajorGBN to collect, process, store and analyse the information and documents you submit for the sole purpose of conducting a forensic financial audit and pursuing the recovery of excess or illegitimate bank charges on your behalf. All personal and corporate data is handled in accordance with the Nigeria Data Protection Act (NDPA) 2023, on a lawful, fair and transparent basis, and retained only for as long as necessary for the engagement and applicable record-keeping obligations.",
    },
    {
      heading: "2. Purpose Limitation & Consent",
      body: "You consent that any bank statements, letters of authority, identification and supporting documents you upload are used exclusively for the forensic audit and recovery engagement, and not for any unrelated purpose. Data is not sold and is shared only with parties strictly necessary to deliver the engagement (e.g. your bank during recovery correspondence).",
    },
    {
      heading: "3. Confidentiality",
      body: "MajorGBN undertakes to keep all information and documents you provide strictly confidential, and to disclose them only as required to prosecute your recovery, to comply with the law, or as you direct in writing. A mutual Non-Disclosure Agreement governs all information exchanged during this engagement.",
    },
    {
      heading: "4. Authorisation to Review Financial Records",
      body: "You authorise MajorGBN and its assigned forensic team to review and analyse the bank statements and supporting documents you provide (and, where a Letter of Authority is furnished, to request and review records from the named financial institution(s)) for the purpose of identifying recoverable charges under CBN regulations and the BOFIA Act 2020.",
    },
    {
      heading: "5. Customer Declaration of Accuracy & Authority",
      body: "You declare that all information and documents you submit are accurate, authentic, and provided with proper authority on behalf of the company, and that you are duly authorised to instruct this engagement. Submitting falsified or unauthorised documents may render the engagement void and is your sole responsibility.",
    },
    {
      heading: "6. Fees",
      body: "The engagement operates on a zero-risk basis: a success fee of 30% applies only to amounts actually recovered. No recovery, no fee, save for any out-of-pocket costs expressly agreed in writing in advance.",
    },
    {
      heading: "7. Limitation of Liability",
      body: "MajorGBN performs the engagement with professional diligence but does not guarantee any specific recovery outcome, which depends on the underlying records and the conduct of the financial institution(s). To the maximum extent permitted by law, MajorGBN's liability arising from the engagement is limited to the fees received in respect of it, and MajorGBN is not liable for indirect or consequential loss.",
    },
    {
      heading: "8. Dispute Resolution",
      body: "Any dispute arising out of or relating to this engagement shall first be resolved through good-faith negotiation, and failing that, by arbitration in Lagos, Nigeria, in accordance with the Arbitration and Mediation Act 2023. This engagement is governed by the laws of the Federal Republic of Nigeria.",
    },
    {
      heading: "9. Acknowledgement & Acceptance",
      body: "By typing your full name as signature and ticking the acceptance box, you confirm that you have read, understood and accept these engagement terms and this data protection policy on behalf of the company, and that your electronic acceptance has the same effect as a handwritten signature.",
    },
  ],
};
