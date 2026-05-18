import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const items = await db.webhookDelivery.findMany({
    where: { webhookId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      event: true,
      status: true,
      attempts: true,
      responseCode: true,
      lastAttemptAt: true,
      nextAttemptAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: items.map((d) => ({
      ...d,
      lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
      nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
