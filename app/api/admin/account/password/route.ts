import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 12) {
    return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "New password must differ from current." }, { status: 400 });
  }

  const user = await db.adminUser.findUnique({ where: { id: admin.id } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  await db.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await recordAudit({
    action: "admin_password_change",
    actorLabel: admin.email,
    targetType: "AdminUser",
    targetId: admin.id,
  });

  return NextResponse.json({ success: true });
}
