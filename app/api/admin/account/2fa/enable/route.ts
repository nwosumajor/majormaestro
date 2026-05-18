import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret, verifyCode } from "@/lib/totp";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code) return NextResponse.json({ error: "Authenticator code is required." }, { status: 400 });

  const user = await db.adminUser.findUnique({ where: { id: admin.id } });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "Call /setup before /enable." }, { status: 400 });
  }

  const ok = verifyCode(decryptSecret(user.totpSecret), code);
  if (!ok) return NextResponse.json({ error: "Invalid code. Try again." }, { status: 401 });

  await db.adminUser.update({
    where: { id: admin.id },
    data: { totpEnabled: true },
  });
  await recordAudit({
    action: "admin_2fa_enable",
    actorLabel: admin.email,
    targetType: "AdminUser",
    targetId: admin.id,
  });

  return NextResponse.json({ success: true });
}
