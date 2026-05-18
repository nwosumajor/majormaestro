export const STEP_KEYS = [
  "received",
  "reviewing",
  "documents",
  "auditing",
  "findings",
  "engagement",
  "recovered",
] as const;

export type StepKey = (typeof STEP_KEYS)[number];

export const STEP_DEFS: Record<StepKey, { label: string; description: string }> = {
  received: {
    label: "Complaint Received",
    description: "Your intake form has been received and logged into our secure case management system.",
  },
  reviewing: {
    label: "Initial Review",
    description: "A senior forensics analyst has reviewed your submission and confirmed eligibility for a full audit.",
  },
  documents: {
    label: "Document Collection",
    description: "Our team has contacted you to arrange collection or secure upload of bank statements and facility letters.",
  },
  auditing: {
    label: "Forensic Audit in Progress",
    description: "Our team is conducting a line-by-line forensic review of your bank charges against CBN/BOFIA approved rates.",
  },
  findings: {
    label: "Findings Report Prepared",
    description: "The forensic findings report is being compiled, detailing all excess charges identified and the recovery quantum.",
  },
  engagement: {
    label: "Bank Engagement / Recovery",
    description: "Formal demand letters have been dispatched and negotiation with your bank is underway.",
  },
  recovered: {
    label: "Recovery Confirmed",
    description: "Excess charges have been recovered and credited back to your account.",
  },
};

export const TEAMS = [
  "Lagos Forensics Team",
  "Abuja Recovery Desk",
  "Port Harcourt Unit",
  "Kano Commercial Team",
] as const;

export function pickTeam(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TEAMS[hash % TEAMS.length];
}
