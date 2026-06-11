// Scholarship lifecycle — single source of truth for statuses, the allowed
// state transitions (the "review board" decision rules), badge tones, and the
// human-facing reference generator. Pure + dependency-light (mirrors lib/gicn.ts)
// so it is safe to import from both server routes and client UI, and unit-tested.

import { randomBytes } from "crypto";

export const SCHOLARSHIP_STATUSES = [
  "applied",
  "under_review",
  "awarded",
  "rejected",
  "onboarding",
  "active",
  "suspended",
  "completed",
  "terminated",
  "withdrawn",
] as const;
export type ScholarshipStatus = (typeof SCHOLARSHIP_STATUSES)[number];

export const SCHOLARSHIP_STATUS_LABELS: Record<ScholarshipStatus, string> = {
  applied: "Applied",
  under_review: "Under review",
  awarded: "Awarded",
  rejected: "Rejected",
  onboarding: "Onboarding",
  active: "Active",
  suspended: "Suspended",
  completed: "Completed",
  terminated: "Terminated",
  withdrawn: "Withdrawn",
};

/** Tailwind badge classes per status (reused by admin + guardian UI). */
export const SCHOLARSHIP_STATUS_TONE: Record<ScholarshipStatus, string> = {
  applied: "bg-slate-100 text-slate-600",
  under_review: "bg-amber-100 text-amber-700",
  awarded: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  onboarding: "bg-indigo-100 text-indigo-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  terminated: "bg-red-100 text-red-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

export type ScholarshipAction =
  | "apply"
  | "nominate"
  | "claim"
  | "award"
  | "reject"
  | "request_changes"
  | "onboarding_submit"
  | "verify_activate"
  | "suspend"
  | "reinstate"
  | "complete"
  | "terminate"
  | "withdraw"
  | "renew";

interface ActionDef {
  /** "new" = a creation action (not a transition of an existing row). */
  from: ScholarshipStatus[] | "new";
  to: ScholarshipStatus;
  actor: "guardian" | "board";
}

export const SCHOLARSHIP_ACTIONS: Record<ScholarshipAction, ActionDef> = {
  apply: { from: "new", to: "applied", actor: "guardian" },
  nominate: { from: "new", to: "under_review", actor: "board" },
  claim: { from: ["applied"], to: "under_review", actor: "board" },
  award: { from: ["applied", "under_review"], to: "awarded", actor: "board" },
  reject: { from: ["applied", "under_review"], to: "rejected", actor: "board" },
  request_changes: { from: ["under_review"], to: "applied", actor: "board" },
  onboarding_submit: { from: ["awarded"], to: "onboarding", actor: "guardian" },
  verify_activate: { from: ["onboarding"], to: "active", actor: "board" },
  suspend: { from: ["active"], to: "suspended", actor: "board" },
  reinstate: { from: ["suspended"], to: "active", actor: "board" },
  complete: { from: ["active", "suspended"], to: "completed", actor: "board" },
  terminate: { from: ["awarded", "onboarding", "active", "suspended"], to: "terminated", actor: "board" },
  withdraw: { from: ["applied", "under_review", "awarded", "onboarding"], to: "withdrawn", actor: "board" },
  renew: { from: ["active"], to: "active", actor: "board" },
};

export function isScholarshipStatus(s: string): s is ScholarshipStatus {
  return (SCHOLARSHIP_STATUSES as readonly string[]).includes(s);
}

export function isScholarshipAction(s: string): s is ScholarshipAction {
  return Object.prototype.hasOwnProperty.call(SCHOLARSHIP_ACTIONS, s);
}

/** Whether `action` may be applied to a row currently in `from`. */
export function canTransition(action: ScholarshipAction, from: ScholarshipStatus): boolean {
  const def = SCHOLARSHIP_ACTIONS[action];
  if (!def || def.from === "new") return false;
  return def.from.includes(from);
}

export function targetStatus(action: ScholarshipAction): ScholarshipStatus | null {
  return SCHOLARSHIP_ACTIONS[action]?.to ?? null;
}

const TERMINAL: ScholarshipStatus[] = ["rejected", "completed", "terminated", "withdrawn"];
export function isTerminalStatus(s: ScholarshipStatus): boolean {
  return TERMINAL.includes(s);
}

/** Unambiguous alphabet (no I/O/0/1) — matches the GICN check-in code style. */
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newScholarshipReference(): string {
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  return `SCH-${s}`;
}
