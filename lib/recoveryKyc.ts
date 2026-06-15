// Recovery-intake KYC constants + helpers (Features 4 & 5).
// Const-union pattern mirrors lib/gicn.ts — the DB stores the string; this file
// is the single source of truth for the allowed values and their labels.

export const REPRESENTATIVE_ID_TYPES = [
  "nin",
  "passport",
  "drivers_license",
  "voters_card",
] as const;

export type RepresentativeIdType = (typeof REPRESENTATIVE_ID_TYPES)[number];

export const REPRESENTATIVE_ID_LABELS: Record<RepresentativeIdType, string> = {
  nin: "National Identification Number (NIN)",
  passport: "International Passport",
  drivers_license: "Driver's Licence",
  voters_card: "Voter's Card",
};

export function isRepresentativeIdType(v: unknown): v is RepresentativeIdType {
  return typeof v === "string" && (REPRESENTATIVE_ID_TYPES as readonly string[]).includes(v);
}

export function representativeIdLabel(v: string | null | undefined): string {
  return v && isRepresentativeIdType(v) ? REPRESENTATIVE_ID_LABELS[v] : "—";
}
