import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { applyScholarshipDecision } from "@/lib/scholarshipDecide";
import { newScholarshipReference } from "@/lib/scholarship";

// Integration: real Postgres. Skips gracefully when no DATABASE_URL (local).
const run = describe.runIf(!!db);

run("scholarship lifecycle + ownership (integration)", () => {
  const ids = { user: "", other: "", participant: "", program: "", award: "" };

  beforeAll(async () => {
    if (!db) return;
    const user = await db.user.create({ data: { email: `itest-owner-${Date.now()}@itest.local`, name: "Test Owner" } });
    const other = await db.user.create({ data: { email: `itest-other-${Date.now()}@itest.local`, name: "Other Owner" } });
    const participant = await db.participant.create({
      data: { ownerUserId: user.id, fullName: "Test Scholar", dateOfBirth: new Date("2012-01-01"), guardianName: "Test Guardian", consentGrantedAt: new Date(), consentGrantedByUserId: user.id },
    });
    const program = await db.program.create({ data: { title: "Integration Scholarship", type: "SCHOLARSHIP", startsAt: new Date(), endsAt: new Date(Date.now() + 86400000), status: "OPEN" } });
    const award = await db.scholarshipAward.create({ data: { reference: newScholarshipReference(), participantId: participant.id, programId: program.id, awardAmountKobo: BigInt(0), status: "under_review" } });
    ids.user = user.id; ids.other = other.id; ids.participant = participant.id; ids.program = program.id; ids.award = award.id;
  });

  afterAll(async () => {
    if (!db) return;
    await db.auditLog.deleteMany({ where: { targetId: ids.award } });
    if (ids.participant) await db.participant.delete({ where: { id: ids.participant } }).catch(() => {}); // cascades the award + children
    if (ids.program) await db.program.delete({ where: { id: ids.program } }).catch(() => {});
    if (ids.user) await db.user.delete({ where: { id: ids.user } }).catch(() => {});
    if (ids.other) await db.user.delete({ where: { id: ids.other } }).catch(() => {});
  });

  it("awards (under_review → awarded), persisting amount + timeline + audit", async () => {
    const r = await applyScholarshipDecision(ids.award, "award", "admin@itest", { awardAmountNgn: 50000, term: "Term 1" });
    expect(r.ok).toBe(true);
    expect(r.status).toBe("awarded");

    const a = await db!.scholarshipAward.findUnique({ where: { id: ids.award }, select: { status: true, awardedBy: true, awardAmountKobo: true, term: true } });
    expect(a?.status).toBe("awarded");
    expect(a?.awardedBy).toBe("admin@itest");
    expect(a?.awardAmountKobo).toBe(BigInt(5_000_000));
    expect(a?.term).toBe("Term 1");

    const reviews = await db!.scholarshipReview.count({ where: { awardId: ids.award, action: "award" } });
    expect(reviews).toBeGreaterThanOrEqual(1);
    const audits = await db!.auditLog.count({ where: { targetId: ids.award, action: "gicn_scholarship_award" } });
    expect(audits).toBeGreaterThanOrEqual(1);
  });

  it("rejects an invalid transition (award again from awarded)", async () => {
    const r = await applyScholarshipDecision(ids.award, "award", "admin@itest", {});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not allowed/i);
  });

  it("advances through onboarding → active", async () => {
    const sub = await applyScholarshipDecision(ids.award, "onboarding_submit", "guardian:itest", {});
    expect(sub.status).toBe("onboarding");
    const act = await applyScholarshipDecision(ids.award, "verify_activate", "admin@itest", {});
    expect(act.status).toBe("active");
    const a = await db!.scholarshipAward.findUnique({ where: { id: ids.award }, select: { activatedAt: true } });
    expect(a?.activatedAt).toBeTruthy();
  });

  it("isolates ownership — only the owner's scoped query finds the award", async () => {
    const asOwner = await db!.scholarshipAward.findFirst({ where: { id: ids.award, participant: { ownerUserId: ids.user } }, select: { id: true } });
    expect(asOwner?.id).toBe(ids.award);
    const asOther = await db!.scholarshipAward.findFirst({ where: { id: ids.award, participant: { ownerUserId: ids.other } }, select: { id: true } });
    expect(asOther).toBeNull();
  });
});
