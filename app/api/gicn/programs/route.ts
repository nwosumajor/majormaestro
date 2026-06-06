import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public list of OPEN programmes (no PII) — used by the sponsor form + programs page.
export async function GET() {
  if (!db) return NextResponse.json({ items: [] });
  const programs = await db.program.findMany({
    where: { status: "OPEN" },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      type: true,
      description: true,
      startsAt: true,
      endsAt: true,
      location: true,
      capacity: true,
      _count: { select: { registrations: { where: { status: "APPROVED" } } } },
    },
  });
  return NextResponse.json({
    items: programs.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      description: p.description,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt.toISOString(),
      location: p.location,
      capacity: p.capacity,
      confirmed: p._count.registrations,
      spotsLeft: p.capacity != null ? Math.max(0, p.capacity - p._count.registrations) : null,
    })),
  });
}
