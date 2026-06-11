import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

const STANDINGS = new Set(["on_track", "at_risk", "breach"]);

// Add a per-term academic record (monitoring) — admin, scholarship.review.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.review");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as {
    term?: string; academicYear?: string; school?: string; classLevel?: string;
    gradeOrGpa?: string; attendancePct?: number; standing?: string; note?: string;
  };
  const term = (b.term ?? "").trim();
  if (!term) return NextResponse.json({ error: "Term is required." }, { status: 400 });
  const standing = b.standing && STANDINGS.has(b.standing) ? b.standing : "on_track";
  const attendancePct = Number.isFinite(b.attendancePct) ? Math.max(0, Math.min(100, Math.round(b.attendancePct as number))) : null;

  const award = await db.scholarshipAward.findUnique({ where: { id }, select: { id: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const r = await db.scholarshipAcademicRecord.create({
    data: {
      awardId: id, term, academicYear: b.academicYear?.trim() || null, school: b.school?.trim() || null,
      classLevel: b.classLevel?.trim() || null, gradeOrGpa: b.gradeOrGpa?.trim() || null,
      attendancePct, standing, note: b.note?.trim() || null, recordedBy: gate.admin.email,
    },
    select: { id: true },
  });
  await recordAudit({ action: "gicn_scholarship_academic_add", actorLabel: gate.admin.email, targetType: "ScholarshipAward", targetId: id, metadata: { recordId: r.id, standing } });
  return NextResponse.json({ id: r.id }, { status: 201 });
}
