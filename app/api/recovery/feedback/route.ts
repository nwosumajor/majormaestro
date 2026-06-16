import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

// Public post-recovery NPS/satisfaction submission (linked from the "case
// recovered" email). Rate-limited; responds 200 generically whether or not the
// reference resolves, to avoid case-reference enumeration.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(`feedback:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const body = (await req.json().catch(() => ({}))) as { ref?: string; score?: number; comment?: string };
  const ref = (body.ref ?? "").trim().toUpperCase();
  const score = Number(body.score);
  if (!ref || !Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: "A reference and a score from 0–10 are required." }, { status: 422 });
  }
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) || null : null;

  if (db) {
    try {
      const complaint = await db.recoveryComplaint.findUnique({ where: { referenceId: ref }, select: { id: true } });
      if (complaint) {
        await db.caseFeedback.create({ data: { complaintId: complaint.id, score, comment } });
        await recordAudit({
          action: "recovery_feedback_submitted",
          actorLabel: ref,
          targetType: "RecoveryComplaint",
          targetId: ref,
          metadata: { score, hasComment: !!comment },
        });
      }
    } catch (err) {
      console.error("[recovery/feedback] error:", err);
    }
  }
  // Always 200 — never reveal whether the reference exists.
  return NextResponse.json({ ok: true });
}
