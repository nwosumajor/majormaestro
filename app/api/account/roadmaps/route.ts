import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const MAX_LABEL = 200;
const MAX_PER_USER = 100;

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const items = await db.savedRoadmap.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
  });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    input?: unknown;
    results?: unknown;
    completedMilestones?: number[];
  };
  if (!body.label?.trim() || !body.input || !body.results) {
    return NextResponse.json({ error: "label, input and results are required." }, { status: 400 });
  }
  if (body.label.length > MAX_LABEL) {
    return NextResponse.json({ error: "Label too long." }, { status: 400 });
  }
  const milestones = Array.isArray(body.completedMilestones)
    ? body.completedMilestones.filter((n) => Number.isInteger(n) && n >= 0)
    : [];

  const count = await db.savedRoadmap.count({ where: { userId: user.id } });
  if (count >= MAX_PER_USER) {
    return NextResponse.json({ error: `Per-user limit of ${MAX_PER_USER} reached.` }, { status: 400 });
  }

  const created = await db.savedRoadmap.create({
    data: {
      userId: user.id,
      label: body.label.trim(),
      input: body.input as Prisma.InputJsonValue,
      results: body.results as Prisma.InputJsonValue,
      completedMilestones: milestones,
    },
  });
  return NextResponse.json({ ...created, createdAt: created.createdAt.toISOString() });
}

export async function PATCH(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, completedMilestones } = (await req.json().catch(() => ({}))) as {
    id?: string;
    completedMilestones?: number[];
  };
  if (!id || !Array.isArray(completedMilestones)) {
    return NextResponse.json({ error: "id and completedMilestones are required." }, { status: 400 });
  }
  const item = await db.savedRoadmap.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const milestones = completedMilestones.filter((n) => Number.isInteger(n) && n >= 0);
  await db.savedRoadmap.update({
    where: { id },
    data: { completedMilestones: milestones },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const item = await db.savedRoadmap.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.savedRoadmap.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
