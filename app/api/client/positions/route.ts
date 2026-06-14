import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

const positionSelect = {
  id: true,
  industryCategory: true,
  departmentName: true,
  description: true,
  isCustom: true,
} as const;

// GET — the hybrid catalog: all system positions (userId=null) + this user's own
// custom positions. Never another user's custom rows.
export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const positions = await db.position.findMany({
    where: { OR: [{ userId: null }, { userId: user.id }] },
    orderBy: [{ industryCategory: "asc" }, { departmentName: "asc" }],
    select: positionSelect,
  });

  return NextResponse.json({ items: positions });
}

// POST — create a custom position for the signed-in user.
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rl = await rateLimit(`positions:create:${user.id}`, 20, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many positions created. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  let body: { industryCategory?: unknown; departmentName?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const industryCategory = typeof body.industryCategory === "string" ? body.industryCategory.trim() : "";
  const departmentName = typeof body.departmentName === "string" ? body.departmentName.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;

  if (!industryCategory || !departmentName) {
    return NextResponse.json(
      { error: "industryCategory and departmentName are required." },
      { status: 400 }
    );
  }
  if (departmentName.length > 120 || industryCategory.length > 120) {
    return NextResponse.json({ error: "Field too long (max 120 characters)." }, { status: 400 });
  }

  // Avoid duplicating a position the user already has (system or their own).
  const existing = await db.position.findFirst({
    where: {
      departmentName,
      industryCategory,
      OR: [{ userId: null }, { userId: user.id }],
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "That position already exists in your catalog." },
      { status: 409 }
    );
  }

  const created = await db.position.create({
    data: { userId: user.id, industryCategory, departmentName, description, isCustom: true },
    select: positionSelect,
  });

  await recordAudit({
    action: "position.create",
    actorLabel: user.email,
    targetType: "Position",
    targetId: created.id,
    metadata: { industryCategory, departmentName },
  });

  return NextResponse.json({ position: created }, { status: 201, headers: rateLimitHeaders(rl) });
}
