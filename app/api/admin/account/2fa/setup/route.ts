import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret, generateSecret, qrDataUrl } from "@/lib/totp";

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = generateSecret();
  const qr = await qrDataUrl(admin.email, secret);

  // Stash encrypted secret on the user but DON'T enable yet — only on /enable after verification
  await db.adminUser.update({
    where: { id: admin.id },
    data: { totpSecret: encryptSecret(secret), totpEnabled: false },
  });

  return NextResponse.json({
    qrDataUrl: qr,
    manualEntryKey: secret,
  });
}
