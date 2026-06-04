import { randomBytes } from "crypto";

// ─── GICN constants (String + const unions, matching platform convention) ───

export const GICN_KINDS = ["guardian", "school"] as const;
export type GicnKind = (typeof GICN_KINDS)[number];

export const PROGRAM_TYPES = [
  "SCHOLARSHIP",
  "LEADERSHIP_CONFERENCE",
  "CHRISTIAN_CAMP",
  "INTELLECTUAL_COMPETITION",
  "TALENT_SHOW",
  "ACADEMIC_COMPETITION",
  "OTHER",
] as const;
export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
  SCHOLARSHIP: "Scholarship",
  LEADERSHIP_CONFERENCE: "Leadership Conference",
  CHRISTIAN_CAMP: "Christian Camp",
  INTELLECTUAL_COMPETITION: "Intellectual Competition",
  TALENT_SHOW: "Talent Show",
  ACADEMIC_COMPETITION: "Academic Competition",
  OTHER: "Other",
};

export const PROGRAM_STATUSES = ["DRAFT", "OPEN", "CLOSED", "COMPLETED"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const REGISTRATION_STATUSES = ["PENDING", "CONFIRMED", "WAITLISTED", "CANCELLED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export function isProgramType(s: string): s is ProgramType {
  return (PROGRAM_TYPES as readonly string[]).includes(s);
}
export function isProgramStatus(s: string): s is ProgramStatus {
  return (PROGRAM_STATUSES as readonly string[]).includes(s);
}

// Unique check-in code per registration (DB @unique + caller retries on clash).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateCheckInCode(): string {
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `GICN-${s}`;
}

export function ageFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
