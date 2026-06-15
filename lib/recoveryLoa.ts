// Letter-of-Authorization signatory policy (Feature 3).
// Recommendation: the LoA must be signed by at least two Directors, OR a Board
// Resolution is provided, OR — where the company has a Sole Director — the sole
// Director signs alone. Strictness is configurable (advisory by default).

export const AUTHORIZATION_METHODS = [
  "two_directors",
  "board_resolution",
  "sole_director",
] as const;

export type AuthorizationMethod = (typeof AUTHORIZATION_METHODS)[number];

export const AUTHORIZATION_METHOD_LABELS: Record<AuthorizationMethod, string> = {
  two_directors: "Letter of Authority signed by two Directors",
  board_resolution: "Board Resolution",
  sole_director: "Letter of Authority signed by the Sole Director",
};

export function isAuthorizationMethod(v: unknown): v is AuthorizationMethod {
  return typeof v === "string" && (AUTHORIZATION_METHODS as readonly string[]).includes(v);
}

export function authorizationMethodLabel(v: string | null | undefined): string {
  return v && isAuthorizationMethod(v) ? AUTHORIZATION_METHOD_LABELS[v] : "—";
}

export interface LoaSignatory {
  name: string;
  title: string;
}

// Normalize/clean a submitted signatory list: keep entries with a non-empty
// name, trim, and cap the count to a sane bound.
export function sanitizeSignatories(input: unknown): LoaSignatory[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s): s is { name?: unknown; title?: unknown } => typeof s === "object" && s !== null)
    .map((s) => ({
      name: typeof s.name === "string" ? s.name.trim() : "",
      title: typeof s.title === "string" ? s.title.trim() : "",
    }))
    .filter((s) => s.name.length > 0)
    .slice(0, 10);
}

export interface ConformanceInput {
  method: AuthorizationMethod;
  signatories: LoaSignatory[];
  companyHasSoleDirector: boolean;
  documentTypes: string[]; // documentType values present on the submission
}

export interface ConformanceResult {
  ok: boolean;
  reasons: string[];
}

// Pure conformance check against the recommended signatory policy. Callers decide
// whether a failure blocks (strict) or merely warns (advisory).
export function checkLoaConformance(input: ConformanceInput): ConformanceResult {
  const { method, signatories, companyHasSoleDirector, documentTypes } = input;
  const has = (t: string) => documentTypes.includes(t);
  const reasons: string[] = [];

  if (method === "two_directors") {
    if (signatories.length < 2) reasons.push("A Letter of Authority signed by at least two Directors is required.");
    if (!has("letter-of-authority")) reasons.push("Please attach the Letter of Authority document.");
  } else if (method === "sole_director") {
    if (!companyHasSoleDirector) reasons.push("Sole-director authorisation is only valid where the company has a single Director.");
    if (signatories.length < 1) reasons.push("The sole Director's signatory details are required.");
    if (!has("letter-of-authority")) reasons.push("Please attach the Letter of Authority document.");
  } else if (method === "board_resolution") {
    if (!has("board-resolution")) reasons.push("Please attach the Board Resolution document.");
  }

  return { ok: reasons.length === 0, reasons };
}

export type LoaEnforcementMode = "strict" | "advisory";

// Reads LOA_SIGNATORY_ENFORCEMENT; defaults to "advisory" so the firm can tighten
// to "strict" without a code change.
export function loaEnforcementMode(): LoaEnforcementMode {
  return process.env.LOA_SIGNATORY_ENFORCEMENT === "strict" ? "strict" : "advisory";
}
