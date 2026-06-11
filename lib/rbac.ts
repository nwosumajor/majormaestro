import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";

/**
 * Admin RBAC — deny-by-default. Three roles; permission checks are enforced
 * SERVER-SIDE in every /api/admin/* handler via requireAdmin(). UI hiding is
 * UX only; the API is the source of truth.
 *
 * Sensitive/mutating permissions additionally require the admin to have 2FA
 * enrolled (read access does not), so privileged actions can't be taken from a
 * password-only account.
 */
/**
 * Roles form a per-section hierarchy. The owner spans everything; each section
 * (Recovery, GICN) has senior → lead → base tiers with least-privilege access,
 * and the two sections are mutually isolated (only owner spans both).
 *   owner
 *   recovery: recovery_senior_manager > recovery_lead_manager > manager
 *   gicn:     gicn_senior_manager     > gicn_lead_manager     > gicn_manager
 *   viewer (read-only recovery oversight — retained)
 */
export type AdminRole =
  | "owner"
  | "recovery_senior_manager"
  | "recovery_lead_manager"
  | "manager" // base recovery tier (lowest)
  | "gicn_senior_manager"
  | "gicn_lead_manager"
  | "gicn_manager" // base GICN tier (lowest)
  | "viewer";

export type Permission =
  | "cases.read"
  | "cases.write"
  | "pii.download"
  | "pii.export"
  | "webhooks.manage"
  | "users.manage"
  | "retention.purge"
  | "audit.purge"
  | "referrals.read"
  | "referrals.payout"
  | "gicn.manage"
  | "gicn.checkin"
  | "scholarship.review"
  | "scholarship.disburse"
  | "ops.email_test";

const KNOWN_ROLES: AdminRole[] = [
  "owner",
  "recovery_senior_manager",
  "recovery_lead_manager",
  "manager",
  "gicn_senior_manager",
  "gicn_lead_manager",
  "gicn_manager",
  "viewer",
];

/**
 * Map any stored value to a known role. Unknown/legacy-unmigrated values fall
 * back to the LEAST-privileged role (viewer) — deny-by-default. (Existing
 * `manager`/`gicn_manager` rows are migrated to the lead tier in the role
 * migration; the bare strings going forward mean the base section tier.)
 */
export function normalizeRole(r: string | null | undefined): AdminRole {
  return r && (KNOWN_ROLES as string[]).includes(r) ? (r as AdminRole) : "viewer";
}

export const ASSIGNABLE_ROLES: AdminRole[] = [...KNOWN_ROLES];

const PERMISSIONS: Record<AdminRole, Permission[] | "*"> = {
  owner: "*", // total control: every section + app-global admin (users, audit purge)

  // ── Recovery (forensic) section — no GICN access ──────────────────────────
  // Senior: total control over Recovery (incl. PII export, referral payouts,
  // case webhooks, and document-retention purge — all section operations).
  recovery_senior_manager: ["cases.read", "cases.write", "pii.download", "pii.export", "referrals.read", "referrals.payout", "webhooks.manage", "retention.purge", "ops.email_test"],
  // Lead: full case work + view sensitive documents + referral visibility.
  recovery_lead_manager: ["cases.read", "cases.write", "pii.download", "referrals.read", "ops.email_test"],
  // Base: day-to-day case handling only (no bulk PII export, no doc downloads).
  manager: ["cases.read", "cases.write"],

  // ── GICN (youth/NGO) section — no Recovery access ─────────────────────────
  // Senior: total control over GICN (incl. scholarship disbursement + the
  // step-up NIN/account reveal).
  gicn_senior_manager: ["gicn.manage", "gicn.checkin", "scholarship.review", "scholarship.disburse"],
  // Lead: programmes/check-in + scholarship review (no money/NIN reveal).
  gicn_lead_manager: ["gicn.manage", "gicn.checkin", "scholarship.review"],
  // Base: programmes + check-in only.
  gicn_manager: ["gicn.manage", "gicn.checkin"],

  // Read-only recovery oversight.
  viewer: ["cases.read"],
};

// Everything except plain reads requires 2FA enrolled.
const REQUIRE_2FA = new Set<Permission>([
  "cases.write",
  "pii.download",
  "pii.export",
  "webhooks.manage",
  "users.manage",
  "retention.purge",
  "audit.purge",
  "referrals.payout",
  "gicn.manage",
  "gicn.checkin",
  "scholarship.review",
  "scholarship.disburse",
  "ops.email_test",
]);

export function can(role: AdminRole, perm: Permission): boolean {
  const p = PERMISSIONS[role];
  return p === "*" || p.includes(perm);
}

type Gate =
  | { error: NextResponse; admin?: undefined; role?: undefined }
  | { error?: undefined; admin: { id: string; email: string; role: string; totpEnabled: boolean }; role: AdminRole };

/**
 * Guard for /api/admin/* handlers. Usage:
 *   const gate = await requireAdmin(req, "cases.write");
 *   if (gate.error) return gate.error;
 *   const { admin } = gate;
 */
export async function requireAdmin(req: NextRequest, perm: Permission): Promise<Gate> {
  const admin = await getAdminFromRequest(req);
  if (!admin) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = normalizeRole(admin.role);
  if (!can(role, perm)) {
    return { error: NextResponse.json({ error: "Forbidden — your role does not permit this action." }, { status: 403 }) };
  }
  if (REQUIRE_2FA.has(perm) && !admin.totpEnabled) {
    return {
      error: NextResponse.json(
        { error: "Two-factor authentication required. Enable 2FA in your account to perform this action." },
        { status: 403 }
      ),
    };
  }
  return { admin, role };
}
