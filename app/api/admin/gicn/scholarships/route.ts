import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { encryptSecret } from "@/lib/totp";

// Scholarship awards — admin, gicn.manage.
//
// NDPA note: NIN is collected ONLY here, on a scholarship-award record, from
// the adult account holder (never at participant registration), and is stored
// ENCRYPTED at rest via the shared AES-256-GCM helper (same as TOTP secrets).
// The plaintext NIN is never persisted and never returned by the GET list.
//
// TIER 2 (scaffold): the multi-step review/approval workflow UI is pending —
// this endpoint records the award + encrypted NIN so the data-protection path
// is real and testable today.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const awards = await db.scholarshipAward.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, awardAmountKobo: true, createdAt: true,
      ninEncrypted: true, // mapped to a boolean below — ciphertext never leaves the server
      participant: { select: { fullName: true } },
      program: { select: { title: true } },
    },
  });

  return NextResponse.json({
    items: awards.map((a) => ({
      id: a.id,
      status: a.status,
      awardAmountNgn: Number(a.awardAmountKobo) / 100,
      createdAt: a.createdAt.toISOString(),
      hasNin: a.ninEncrypted != null,
      participantName: a.participant.fullName,
      programTitle: a.program.title,
    })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as {
    participantId?: string; programId?: string; awardAmountNgn?: number; nin?: string; status?: string;
  };
  if (!b.participantId || !b.programId) return NextResponse.json({ error: "participantId and programId are required." }, { status: 400 });
  const amountNgn = Number(b.awardAmountNgn);
  if (!Number.isFinite(amountNgn) || amountNgn < 0) return NextResponse.json({ error: "A valid award amount (₦) is required." }, { status: 400 });

  const participant = await db.participant.findUnique({ where: { id: b.participantId }, select: { id: true } });
  if (!participant) return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  const program = await db.program.findUnique({ where: { id: b.programId }, select: { id: true } });
  if (!program) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

  // Validate + encrypt NIN if supplied. NIN is an 11-digit Nigerian identifier.
  let ninEncrypted: string | null = null;
  if (b.nin != null && String(b.nin).trim()) {
    const nin = String(b.nin).replace(/\s/g, "");
    if (!/^\d{11}$/.test(nin)) return NextResponse.json({ error: "NIN must be 11 digits." }, { status: 400 });
    ninEncrypted = encryptSecret(nin);
  }

  const award = await db.scholarshipAward.create({
    data: {
      participantId: b.participantId,
      programId: b.programId,
      awardAmountKobo: BigInt(Math.round(amountNgn * 100)),
      status: b.status?.trim() || "awarded",
      ninEncrypted,
    },
    select: { id: true },
  });

  await recordAudit({
    action: "gicn_scholarship_award_create",
    actorLabel: gate.admin.email,
    targetType: "ScholarshipAward",
    targetId: award.id,
    metadata: { participantId: b.participantId, programId: b.programId, ninProvided: ninEncrypted != null },
  });

  return NextResponse.json({ id: award.id }, { status: 201 });
}
