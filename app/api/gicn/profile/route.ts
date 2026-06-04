import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { GICN_KINDS, type GicnKind } from "@/lib/gicn";

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const profile = await db.gicnProfile.findUnique({ where: { userId: user.id }, select: { kind: true, organizationName: true, phone: true } });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { kind?: string; organizationName?: string; phone?: string };
  if (!body.kind || !GICN_KINDS.includes(body.kind as GicnKind)) {
    return NextResponse.json({ error: "Choose guardian or school." }, { status: 400 });
  }
  const kind = body.kind as GicnKind;
  const organizationName = kind === "school" ? (body.organizationName ?? "").trim() : null;
  if (kind === "school" && !organizationName) {
    return NextResponse.json({ error: "School name is required for a school partner account." }, { status: 400 });
  }
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim().slice(0, 40) : null;

  const profile = await db.gicnProfile.upsert({
    where: { userId: user.id },
    update: { kind, organizationName, phone },
    create: { userId: user.id, kind, organizationName, phone },
    select: { id: true, kind: true },
  });

  await recordAudit({ action: "gicn_profile_upsert", actorLabel: user.email, targetType: "GicnProfile", targetId: profile.id, metadata: { kind } });
  return NextResponse.json({ profile: { kind: profile.kind } });
}
