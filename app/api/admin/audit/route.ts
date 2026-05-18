import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action")?.trim();
  const actor = sp.get("actor")?.trim();
  const targetId = sp.get("targetId")?.trim();
  const take = Math.min(parseInt(sp.get("take") ?? "100", 10) || 100, 500);
  const cursor = sp.get("cursor")?.trim();

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (actor) where.actorLabel = { contains: actor, mode: "insensitive" };
  if (targetId) where.targetId = targetId;

  const items = await db.auditLog.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  const hasMore = items.length > take;
  const page = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({
    items: page.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    nextCursor,
  });
}
