import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "referrals.read");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const referrals = await db.referral.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      complaints: {
        select: { status: true },
      },
      _count: { select: { complaints: true } },
    },
  });

  const items = referrals.map((r) => {
    const breakdown: Record<string, number> = {};
    for (const c of r.complaints) breakdown[c.status] = (breakdown[c.status] ?? 0) + 1;
    return {
      code: r.code,
      referrerName: r.referrerName,
      referrerEmail: r.referrerEmail,
      createdAt: r.createdAt.toISOString(),
      complaintCount: r._count.complaints,
      recoveredCount: breakdown["recovered"] ?? 0,
      statusBreakdown: breakdown,
    };
  });

  return NextResponse.json({ total: items.length, items });
}
