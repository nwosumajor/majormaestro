import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

  const user = await db.adminUser.findUnique({ where: { id: admin.id } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  await db.adminUser.update({
    where: { id: admin.id },
    data: { totpEnabled: false, totpSecret: null, recoveryCodeHashes: [] },
  });
  await recordAudit({
    action: "admin_2fa_disable",
    actorLabel: admin.email,
    targetType: "AdminUser",
    targetId: admin.id,
  });

  return NextResponse.json({ success: true });
}
