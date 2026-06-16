// Versioned GICN registration agreement bundle, accepted by the adult account
// holder (guardian or school partner) at formal registration. The acceptance
// record stores the `version` string (not the prose), so we always know which
// text was agreed even after a revision. Import-safe on client + server.
//
// ⚠️ LEGAL NOTE (not shown to users): this wording is a reasonable default and
// MUST be reviewed by qualified Nigerian counsel before being relied upon. Under
// Nigerian law a parent/guardian generally cannot fully waive a minor's own
// statutory rights, so the indemnity below structures/reduces risk — it is not
// absolute protection. It does not override mandatory child-protection law.

export interface AgreementSection {
  heading: string;
  body: string;
}

export interface GicnAgreement {
  key: "terms" | "privacy" | "safeguarding" | "indemnity";
  title: string;
  summary: string; // one-line label shown next to the acceptance checkbox
  sections: AgreementSection[];
}

export interface GicnAgreementBundle {
  version: string;
  effectiveDate: string; // ISO date
  agreements: GicnAgreement[];
}

export const GICN_AGREEMENTS: GicnAgreementBundle = {
  version: "gicn-agreements-v1",
  effectiveDate: "2026-06-16",
  agreements: [
    {
      key: "terms",
      title: "Programme Participation Terms",
      summary: "I accept the GICN Programme Participation Terms.",
      sections: [
        {
          heading: "1. Eligibility & Authority",
          body: "I confirm that I am an adult, and that I am the lawful parent/guardian of the child(ren) I register, or a duly authorised representative of the school partner registering students. I am authorised to enrol the named participant(s) in GICN programmes and to accept these agreements on their behalf.",
        },
        {
          heading: "2. Participation",
          body: "Participation in GICN programmes (camps, conferences, competitions, scholarships and related activities) is voluntary. I will provide accurate information, keep it up to date, and comply with programme rules, schedules and the lawful instructions of GICN staff and volunteers.",
        },
        {
          heading: "3. Conduct & Removal",
          body: "GICN may decline, suspend or remove a participant whose conduct, or whose guardian's/school's conduct, endangers others or breaches these terms, acting reasonably and with the welfare of children as the primary consideration.",
        },
      ],
    },
    {
      key: "privacy",
      title: "Privacy & Data-Protection Policy (NDPA 2023)",
      summary: "I have read and accept the Privacy & Data-Protection Policy.",
      sections: [
        {
          heading: "1. Lawful Processing",
          body: "GICN collects and processes the personal data of the account holder and the registered child(ren) solely to administer programme registration, participation, safety, communication and (where applicable) scholarships, on a lawful basis under the Nigeria Data Protection Act (NDPA) 2023.",
        },
        {
          heading: "2. Data Minimisation & Children",
          body: "GICN collects only the data necessary for these purposes and applies heightened care to children's data. Children do not hold accounts. Sensitive identifiers (e.g. NIN) are not collected at registration and, where later required for a scholarship, are encrypted at rest and never displayed in list views.",
        },
        {
          heading: "3. Consent, Sharing & Retention",
          body: "By registering I consent to this processing. Data is shared only with parties strictly necessary to deliver a programme (e.g. a venue or scholarship board) and is retained only as long as necessary or as the law requires. I may request access to or correction of my data, and I understand consent for a child's participation is also captured per child at the point of enrolment.",
        },
      ],
    },
    {
      key: "safeguarding",
      title: "Child Safeguarding & Code of Conduct",
      summary: "I acknowledge the Child Safeguarding policy & Code of Conduct.",
      sections: [
        {
          heading: "1. Safeguarding Commitment",
          body: "GICN is committed to the protection and welfare of every child in its programmes and operates a zero-tolerance policy toward abuse, exploitation or neglect. Staff and volunteers are expected to uphold appropriate conduct at all times.",
        },
        {
          heading: "2. Guardian / School Responsibilities",
          body: "I will disclose any information relevant to the safety or care of the child (e.g. relevant medical needs, where applicable to a programme), provide accurate emergency-contact details, and cooperate with GICN's safeguarding procedures. School partners confirm they have obtained the necessary parental consent for each student they register.",
        },
      ],
    },
    {
      key: "indemnity",
      title: "Liability Waiver & Indemnity",
      summary: "I accept the Liability Waiver & Indemnity.",
      sections: [
        {
          heading: "1. Assumption of Risk",
          body: "I understand that participation in activities such as camps, travel, sports and events carries inherent risks. I voluntarily accept those ordinary risks on behalf of the participant(s) I register.",
        },
        {
          heading: "2. Release & Indemnity",
          body: "To the maximum extent permitted by Nigerian law, I agree to release, indemnify and hold harmless Global Impact Christian Network (GICN), its trustees, staff and volunteers from claims, liabilities, losses or expenses arising from the participant's voluntary involvement in GICN programmes — save for loss caused by GICN's own negligence or wilful misconduct. Nothing in this clause excludes any liability that cannot be excluded by law, and it does not waive a minor's own statutory rights.",
        },
        {
          heading: "3. Authority & Accuracy",
          body: "I confirm I am the lawful parent/guardian (or a duly authorised school representative) with authority to give this indemnity for the named participant(s), and that the information I have provided is accurate. My typed full name below constitutes my electronic signature with the same effect as a handwritten signature.",
        },
      ],
    },
  ],
};
