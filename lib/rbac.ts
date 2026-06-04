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
export type AdminRole = "owner" | "manager" | "viewer";

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
  | "ops.email_test";

/** Map any stored value to a known role. Legacy "admin" → manager. */
export function normalizeRole(r: string | null | undefined): AdminRole {
  if (r === "owner") return "owner";
  if (r === "viewer") return "viewer";
  return "manager";
}

export const ASSIGNABLE_ROLES: AdminRole[] = ["owner", "manager", "viewer"];

const PERMISSIONS: Record<AdminRole, Permission[] | "*"> = {
  owner: "*",
  manager: ["cases.read", "cases.write", "pii.download", "pii.export", "referrals.read", "ops.email_test"],
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
