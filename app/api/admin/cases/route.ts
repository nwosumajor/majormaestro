import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status")?.trim();
  const take = Math.min(parseInt(req.nextUrl.searchParams.get("take") ?? "50", 10) || 50, 200);

  const where: Prisma.RecoveryComplaintWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { referenceId: { contains: q.toUpperCase() } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { rcNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.recoveryComplaint.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        referenceId: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
        turnoverBand: true,
        status: true,
        assignedTeam: true,
        referralCode: true,
        createdAt: true,
        _count: { select: { documents: true, statusEvents: true } },
      },
    }),
    db.recoveryComplaint.count({ where }),
  ]);

  return NextResponse.json({
    total,
    items: items.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
