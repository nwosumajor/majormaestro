import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";

// Referrer email verification: confirms the referrer owns the email before
// payouts are released. Token is single-use (cleared on verify).
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !db) return NextResponse.redirect(`${base}/recovery/refer`);

  const hash = createHash("sha256").update(token).digest("hex");
  const ref = await db.referral.findUnique({
    where: { verificationTokenHash: hash },
    select: { id: true, code: true, verifiedAt: true },
  });
  if (!ref) return NextResponse.redirect(`${base}/recovery/refer`);

  if (!ref.verifiedAt) {
    await db.referral.update({
      where: { id: ref.id },
      data: { verifiedAt: new Date(), verificationTokenHash: null },
    });
  }
  return NextResponse.redirect(`${base}/recovery/refer/${ref.code}`);
}
