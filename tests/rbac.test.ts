import { describe, it, expect, vi } from "vitest";

// rbac.ts imports @/lib/auth (which pulls the DB); stub it so we test the pure
// permission logic in isolation.
vi.mock("@/lib/auth", () => ({ getAdminFromRequest: () => null }));

import { can, normalizeRole, type Permission, type AdminRole } from "@/lib/rbac";

const has = (role: AdminRole, perms: Permission[]) => perms.every((p) => can(role, p));
const hasNone = (role: AdminRole, perms: Permission[]) => perms.every((p) => !can(role, p));

const GICN_PERMS: Permission[] = ["gicn.manage", "gicn.checkin", "scholarship.review", "scholarship.disburse"];
const RECOVERY_PERMS: Permission[] = ["cases.read", "cases.write", "pii.download", "pii.export", "referrals.read", "referrals.payout"];
const OWNER_ONLY: Permission[] = ["users.manage", "audit.purge"];

describe("normalizeRole", () => {
  it("passes known roles through", () => {
    for (const r of ["owner", "recovery_senior_manager", "recovery_lead_manager", "manager", "gicn_senior_manager", "gicn_lead_manager", "gicn_manager", "viewer"] as const) {
      expect(normalizeRole(r)).toBe(r);
    }
  });
  it("defaults unknown/empty to viewer (deny-by-default)", () => {
    expect(normalizeRole("admin")).toBe("viewer");
    expect(normalizeRole("superuser")).toBe("viewer");
    expect(normalizeRole(null)).toBe("viewer");
    expect(normalizeRole(undefined)).toBe("viewer");
  });
});

describe("owner", () => {
  it("has total control (every permission)", () => {
    const all: Permission[] = [...RECOVERY_PERMS, ...GICN_PERMS, ...OWNER_ONLY, "webhooks.manage", "retention.purge", "ops.email_test"];
    expect(has("owner", all)).toBe(true);
  });
});

describe("Recovery section tiers", () => {
  it("recovery_senior_manager = total control of Recovery, no GICN, no app-global admin", () => {
    expect(has("recovery_senior_manager", ["cases.read", "cases.write", "pii.download", "pii.export", "referrals.read", "referrals.payout", "webhooks.manage", "retention.purge", "ops.email_test"])).toBe(true);
    expect(hasNone("recovery_senior_manager", GICN_PERMS)).toBe(true);
    expect(hasNone("recovery_senior_manager", OWNER_ONLY)).toBe(true); // users.manage + audit.purge stay owner-only
  });
  it("recovery_lead_manager = cases + PII view + referral visibility, but not export/payout/webhooks/retention", () => {
    expect(has("recovery_lead_manager", ["cases.read", "cases.write", "pii.download", "referrals.read", "ops.email_test"])).toBe(true);
    expect(hasNone("recovery_lead_manager", ["pii.export", "referrals.payout", "webhooks.manage", "retention.purge"])).toBe(true);
    expect(hasNone("recovery_lead_manager", GICN_PERMS)).toBe(true);
  });
  it("manager (base) = day-to-day case handling only", () => {
    expect(has("manager", ["cases.read", "cases.write"])).toBe(true);
    expect(hasNone("manager", ["pii.download", "pii.export", "referrals.read"])).toBe(true);
    expect(hasNone("manager", GICN_PERMS)).toBe(true);
  });
  it("viewer = read-only cases", () => {
    expect(can("viewer", "cases.read")).toBe(true);
    expect(hasNone("viewer", ["cases.write", "pii.download"])).toBe(true);
    expect(hasNone("viewer", GICN_PERMS)).toBe(true);
  });
});

describe("GICN section tiers", () => {
  it("gicn_senior_manager = total control of GICN incl. disburse/reveal, no Recovery", () => {
    expect(has("gicn_senior_manager", GICN_PERMS)).toBe(true);
    expect(hasNone("gicn_senior_manager", RECOVERY_PERMS)).toBe(true);
    expect(hasNone("gicn_senior_manager", OWNER_ONLY)).toBe(true);
  });
  it("gicn_lead_manager = programmes/check-in + scholarship review, but NOT disburse", () => {
    expect(has("gicn_lead_manager", ["gicn.manage", "gicn.checkin", "scholarship.review"])).toBe(true);
    expect(can("gicn_lead_manager", "scholarship.disburse")).toBe(false);
    expect(hasNone("gicn_lead_manager", RECOVERY_PERMS)).toBe(true);
  });
  it("gicn_manager (base) = programmes + check-in only", () => {
    expect(has("gicn_manager", ["gicn.manage", "gicn.checkin"])).toBe(true);
    expect(hasNone("gicn_manager", ["scholarship.review", "scholarship.disburse"])).toBe(true);
    expect(hasNone("gicn_manager", RECOVERY_PERMS)).toBe(true);
  });
});

describe("section isolation + owner-only invariants", () => {
  it("no Recovery role can touch GICN, and vice versa (only owner spans both)", () => {
    for (const r of ["recovery_senior_manager", "recovery_lead_manager", "manager", "viewer"] as const) expect(hasNone(r, GICN_PERMS)).toBe(true);
    for (const r of ["gicn_senior_manager", "gicn_lead_manager", "gicn_manager"] as const) expect(hasNone(r, RECOVERY_PERMS)).toBe(true);
    expect(can("owner", "gicn.manage") && can("owner", "cases.read")).toBe(true);
  });
  it("users.manage + audit.purge are owner-only", () => {
    for (const r of ["recovery_senior_manager", "recovery_lead_manager", "manager", "gicn_senior_manager", "gicn_lead_manager", "gicn_manager", "viewer"] as const) {
      expect(can(r, "users.manage")).toBe(false);
      expect(can(r, "audit.purge")).toBe(false);
    }
    expect(can("owner", "users.manage")).toBe(true);
    expect(can("owner", "audit.purge")).toBe(true);
  });
});
