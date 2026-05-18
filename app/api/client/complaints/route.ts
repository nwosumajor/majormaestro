import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const complaints = await db.recoveryComplaint.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      referenceId: true,
      companyName: true,
      turnoverBand: true,
      status: true,
      banks: true,
      createdAt: true,
      closedAt: true,
      assignedTeam: true,
    },
  });

  return NextResponse.json({
    items: complaints.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
  });
}
