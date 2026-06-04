import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

// Force sign-out: invalidate all of a given admin's existing sessions (offboarding
// / suspected compromise) without affecting anyone else. Owner-only.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "users.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { id } = await ctx.params;
  const target = await db.adminUser.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!target) return NextResponse.json({ error: "Admin not found." }, { status: 404 });

  await db.adminUser.update({ where: { id }, data: { tokenInvalidBefore: new Date() } });

  await recordAudit({
    action: "admin_sessions_revoked",
    actorLabel: gate.admin.email,
    targetType: "AdminUser",
    targetId: id,
    metadata: { email: target.email },
  });

  return NextResponse.json({ success: true });
}
