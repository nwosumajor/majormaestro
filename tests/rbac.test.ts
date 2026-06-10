import { describe, it, expect, vi } from "vitest";

// rbac.ts imports @/lib/auth (which pulls the DB); stub it so we test the pure
// permission logic in isolation.
vi.mock("@/lib/auth", () => ({ getAdminFromRequest: () => null }));

import { can, normalizeRole, type Permission } from "@/lib/rbac";

describe("normalizeRole", () => {
  it("maps known roles through", () => {
    expect(normalizeRole("owner")).toBe("owner");
    expect(normalizeRole("viewer")).toBe("viewer");
    expect(normalizeRole("gicn_manager")).toBe("gicn_manager");
    expect(normalizeRole("manager")).toBe("manager");
  });

  it("defaults legacy/unknown/empty to manager (least privilege)", () => {
    expect(normalizeRole("admin")).toBe("manager");
    expect(normalizeRole("superuser")).toBe("manager");
    expect(normalizeRole(null)).toBe("manager");
    expect(normalizeRole(undefined)).toBe("manager");
  });
});

describe("can — role permission matrix", () => {
  it("owner can do everything", () => {
    const perms: Permission[] = [
      "cases.read", "cases.write", "pii.download", "pii.export", "webhooks.manage",
      "users.manage", "retention.purge", "audit.purge", "referrals.read",
      "referrals.payout", "gicn.manage", "gicn.checkin", "ops.email_test",
    ];
    for (const p of perms) expect(can("owner", p)).toBe(true);
  });

  it("viewer is read-only (cases.read only)", () => {
    expect(can("viewer", "cases.read")).toBe(true);
    expect(can("viewer", "cases.write")).toBe(false);
    expect(can("viewer", "pii.download")).toBe(false);
    expect(can("viewer", "referrals.read")).toBe(false);
    expect(can("viewer", "gicn.manage")).toBe(false);
  });

  it("manager owns recovery but has NO GICN access", () => {
    expect(can("manager", "cases.read")).toBe(true);
    expect(can("manager", "cases.write")).toBe(true);
    expect(can("manager", "pii.download")).toBe(true);
    expect(can("manager", "referrals.read")).toBe(true);
    expect(can("manager", "ops.email_test")).toBe(true);
    // isolation: no GICN, no owner-only powers
    expect(can("manager", "gicn.manage")).toBe(false);
    expect(can("manager", "gicn.checkin")).toBe(false);
    expect(can("manager", "users.manage")).toBe(false);
    expect(can("manager", "webhooks.manage")).toBe(false);
    expect(can("manager", "audit.purge")).toBe(false);
    expect(can("manager", "referrals.payout")).toBe(false);
  });

  it("gicn_manager owns GICN but has NO recovery/PII/admin access", () => {
    expect(can("gicn_manager", "gicn.manage")).toBe(true);
    expect(can("gicn_manager", "gicn.checkin")).toBe(true);
    // isolation: nothing from the recovery/enterprise side
    expect(can("gicn_manager", "cases.read")).toBe(false);
    expect(can("gicn_manager", "cases.write")).toBe(false);
    expect(can("gicn_manager", "pii.download")).toBe(false);
    expect(can("gicn_manager", "pii.export")).toBe(false);
    expect(can("gicn_manager", "referrals.read")).toBe(false);
    expect(can("gicn_manager", "users.manage")).toBe(false);
    expect(can("gicn_manager", "webhooks.manage")).toBe(false);
    expect(can("gicn_manager", "audit.purge")).toBe(false);
  });

  it("recovery and GICN arms are mutually isolated (only owner spans both)", () => {
    expect(can("manager", "gicn.manage")).toBe(false);
    expect(can("gicn_manager", "cases.read")).toBe(false);
    expect(can("owner", "gicn.manage") && can("owner", "cases.read")).toBe(true);
  });
});
