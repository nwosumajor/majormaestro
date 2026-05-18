import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const COMMISSION_FIRST_PCT = 0.05;
const FIXED_BONUS_NGN = 100_000;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  if (!code) {
    return NextResponse.json({ error: "Referral code required." }, { status: 400 });
  }
  if (!db) {
    return NextResponse.json({ error: "Stats are temporarily unavailable." }, { status: 503 });
  }

  try {
    const referral = await db.referral.findUnique({
      where: { code },
      include: {
        complaints: {
          select: {
            referenceId: true,
            companyName: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!referral) {
      return NextResponse.json({ error: "Referral not found." }, { status: 404 });
    }

    const breakdown: Record<string, number> = {};
    for (const c of referral.complaints) {
      breakdown[c.status] = (breakdown[c.status] ?? 0) + 1;
    }

    const recoveredCount = breakdown["recovered"] ?? 0;
    const completedAuditCount = referral.complaints.filter((c) =>
      ["findings", "engagement", "recovered"].includes(c.status)
    ).length;

    return NextResponse.json({
      code: referral.code,
      referrerName: referral.referrerName,
      createdAt: referral.createdAt.toISOString(),
      totals: {
        leads: referral.complaints.length,
        active: referral.complaints.length - recoveredCount,
        recovered: recoveredCount,
        fixedBonusAccruedNgn: completedAuditCount * FIXED_BONUS_NGN,
        firstRecoveryRatePct: COMMISSION_FIRST_PCT * 100,
      },
      statusBreakdown: breakdown,
      complaints: referral.complaints.map((c) => ({
        referenceId: c.referenceId,
        companyName: c.companyName,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[/api/refer/stats]", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
