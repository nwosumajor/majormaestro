/**
 * Single source of truth for the staff-classification input shape.
 *
 * Imported by BOTH classification flows so the xlsx/csv template, the upload
 * parser, and the prompt builders can never drift:
 *   - app/assessment (individual)  → /api/classify
 *   - /client/bulk-classify (HR)   → cron processor
 *
 * The P/M/S/E fields here are the canonical definitions; the individual
 * assessment UI imports ATTRIBUTE_FIELDS from here too.
 */

export const ATTRIBUTE_FIELDS = [
  { key: "psychological", label: "Psychological Attributes", hint: "Personality traits, cognitive style, temperament, motivations" },
  { key: "mental", label: "Mental Attributes", hint: "Intellectual strengths, learning style, analytical ability" },
  { key: "social", label: "Social Attributes", hint: "Interpersonal skills, communication style, leadership tendency" },
  { key: "environmental", label: "Environmental Attributes", hint: "Work-environment preferences, stress tolerance, adaptability" },
] as const;

export type AttributeKey = (typeof ATTRIBUTE_FIELDS)[number]["key"];

export interface ClassificationInput {
  psychological: string;
  mental: string;
  social: string;
  environmental: string;
  certificates: string[];
}

/** A position the AI is allowed to place a person into. */
export interface AllowedPosition {
  positionId?: string | null; // cuid for DB-backed positions; undefined for the fixed-enum flow
  departmentName: string;
  industryCategory: string;
}

// ─── Bulk template / parse column contract ─────────────────────────────────
// Identity columns + one column per attribute + a certificates column.
// `certificates` cell is comma- or semicolon-separated.

export const STAFF_IDENTITY_COLUMNS = [
  { key: "staffName", label: "Staff Name", required: true },
  { key: "staffRef", label: "Staff Ref (email or employee ID)", required: false },
] as const;

export const TEMPLATE_COLUMNS: { key: string; label: string; required: boolean }[] = [
  ...STAFF_IDENTITY_COLUMNS,
  ...ATTRIBUTE_FIELDS.map((f) => ({ key: f.key, label: f.label, required: true })),
  { key: "certificates", label: "Certificates (comma-separated)", required: false },
];

/** Split a free-text certificates cell into a clean array. */
export function parseCertificates(cell: string | null | undefined): string[] {
  if (!cell) return [];
  return cell
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Seed catalog (system positions, userId = null) ────────────────────────
// Mirrors the ALLOWED_DEPARTMENTS list in /api/classify exactly.

export const SEED_POSITIONS: { industryCategory: string; departmentName: string }[] = (
  [
    ["Banking & Financial Services", ["Corporate Banking", "Retail Banking", "Treasury", "Risk Management", "Compliance and AML", "Internal Audit", "Customer Service", "Investment Banking", "Corporate Communications", "Trade Finance", "Human Resources", "Legal Services", "Strategy and Analytics"]],
    ["Technology & Software Engineering", ["Software Development", "DevOps & Cloud Infrastructure", "Platform Engineering", "QA & Automation", "Data Science & AI", "Product Management", "UX/UI Design", "Cybersecurity & InfoSec", "IT Service Management"]],
    ["Fintech & Digital Payments", ["Payment Gateway Engineering", "Blockchain & Web3", "Core Banking Integration", "E-Channel Security", "Fraud Operations", "Digital Wallet Management", "Product Operations", "Fintech Compliance"]],
    ["Manufacturing, FMCG & Production", ["Production Department", "QA/QC", "Supply Chain", "Procurement", "Maintenance/Engineering", "Logistics", "Product Development", "Sales", "Brand Management", "HSE", "Corporate Affairs", "Warehouse Management"]],
    ["Food Restaurant Chain & Hospitality", ["F&B Management", "Kitchen Operations", "Front Office", "Housekeeping", "Restaurant Operations", "Franchise Management"]],
    ["General Corporate Support Services", ["HR & Admin", "Finance & Accounts", "Legal & Secretariat", "IT", "Corporate Strategy", "Marketing & Comms", "Internal Control", "Facility Management"]],
  ] as const
).flatMap(([industryCategory, depts]) => depts.map((departmentName) => ({ industryCategory, departmentName })));

// ─── Prompt block builders (shared by both flows) ──────────────────────────

export function buildProfileBlock(input: ClassificationInput): string {
  const certList = input.certificates.length > 0 ? input.certificates.join(", ") : "None provided";
  return `STAFF PROFILE:
- Psychological Attributes: ${input.psychological}
- Mental Attributes: ${input.mental}
- Social Attributes: ${input.social}
- Environmental Attributes: ${input.environmental}
- Certificates Acquired: ${certList}`;
}

/** Render the allowed positions, grouped by industry, for the prompt. */
export function buildAllowedListBlock(positions: AllowedPosition[]): string {
  const byIndustry = new Map<string, string[]>();
  for (const p of positions) {
    const arr = byIndustry.get(p.industryCategory) ?? [];
    arr.push(p.departmentName);
    byIndustry.set(p.industryCategory, arr);
  }
  return [...byIndustry.entries()]
    .map(([industry, depts]) => `[${industry}]: ${depts.join(", ")}.`)
    .join("\n\n");
}
