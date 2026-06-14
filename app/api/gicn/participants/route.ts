import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const items = await db.participant.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, dateOfBirth: true, schoolName: true, classLevel: true,
      guardianName: true, mediaReleaseGranted: true, consentGrantedAt: true, createdAt: true,
    },
  });
  return NextResponse.json({ items: items.map((p) => ({ ...p, dateOfBirth: p.dateOfBirth.toISOString(), consentGrantedAt: p.consentGrantedAt.toISOString(), createdAt: p.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rl = await rateLimit(`gicn-participant:${user.id}`, 40, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: "Too many additions. Try again later." }, { status: 429, headers: rateLimitHeaders(rl) });

  const body = (await req.json().catch(() => ({}))) as {
    fullName?: string; dateOfBirth?: string; schoolName?: string; classLevel?: string;
    address?: string; guardianName?: string; consentGranted?: boolean; mediaReleaseGranted?: boolean;
  };
  const fullName = (body.fullName ?? "").trim();
  const guardianName = (body.guardianName ?? "").trim();
  if (!fullName) return NextResponse.json({ error: "Child's full name is required." }, { status: 400 });
  if (!guardianName) return NextResponse.json({ error: "Parent/guardian name is required." }, { status: 400 });
  const dob = new Date(body.dateOfBirth ?? "");
  if (isNaN(dob.getTime()) || dob.getTime() > Date.now()) {
    return NextResponse.json({ error: "A valid date of birth is required." }, { status: 400 });
  }
  // CRITICAL (NDPA, minors): explicit parental/guardian consent required to create the record.
  if (body.consentGranted !== true) {
    return NextResponse.json({ error: "Parental/guardian consent is required to register a child." }, { status: 400 });
  }

  const participant = await db.participant.create({
    data: {
      ownerUserId: user.id,
      fullName,
      dateOfBirth: dob,
      schoolName: (body.schoolName ?? "").trim() || null,
      classLevel: (body.classLevel ?? "").trim() || null,
      address: (body.address ?? "").trim() || null,
      guardianName,
      consentGrantedAt: new Date(),
      consentGrantedByUserId: user.id,
      mediaReleaseGranted: body.mediaReleaseGranted === true,
    },
    select: { id: true },
  });

  await recordAudit({
    action: "gicn_participant_create",
    actorLabel: user.email,
    targetType: "Participant",
    targetId: participant.id,
    metadata: { consentGrantedAt: new Date().toISOString(), mediaRelease: body.mediaReleaseGranted === true },
  });

  return NextResponse.json({ id: participant.id }, { status: 201, headers: rateLimitHeaders(rl) });
}
