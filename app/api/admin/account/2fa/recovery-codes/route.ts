import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRecoveryCodes, getAdminFromRequest, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

// GET: report how many codes are remaining (no plaintext exposure)
export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.adminUser.findUnique({
    where: { id: admin.id },
    select: { totpEnabled: true, recoveryCodeHashes: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({
    totpEnabled: user.totpEnabled,
    remaining: user.recoveryCodeHashes.length,
  });
}

// POST: regenerate a fresh set — requires password confirmation, invalidates old set
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
  if (!user.totpEnabled) {
    return NextResponse.json({ error: "Enable 2FA before generating recovery codes." }, { status: 400 });
  }

  const { plain, hashes } = await generateRecoveryCodes();
  await db.adminUser.update({
    where: { id: admin.id },
    data: { recoveryCodeHashes: hashes },
  });
  await recordAudit({
    action: "admin_2fa_recovery_regen",
    actorLabel: admin.email,
    targetType: "AdminUser",
    targetId: admin.id,
    metadata: { codesIssued: plain.length },
  });

  return NextResponse.json({
    success: true,
    recoveryCodes: plain,
    notice: "Old recovery codes are now invalid. Save these somewhere safe — each one is usable ONCE.",
  });
}
