import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest, verifyStepUp } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req, "users.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const su = (await req.json().catch(() => ({}))) as { stepUpCode?: string; stepUpPassword?: string };
  if (!(await verifyStepUp(gate.admin.id, { code: su.stepUpCode, password: su.stepUpPassword }))) {
    return NextResponse.json({ error: "Re-authentication required. Enter your current 2FA code to confirm." }, { status: 401 });
  }
  const { id } = await ctx.params;

  const actor = await getAdminFromRequest(req);
  if (actor?.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const total = await db.adminUser.count();
  if (total <= 1) {
    return NextResponse.json({ error: "Cannot delete the last remaining admin." }, { status: 400 });
  }

  const target = await db.adminUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  await db.adminUser.delete({ where: { id } });

  await recordAudit({
    action: "admin_user_delete",
    actorLabel: actor?.email ?? "admin",
    targetType: "AdminUser",
    targetId: id,
    metadata: { deletedEmail: target.email },
  });

  return NextResponse.json({ success: true });
}
