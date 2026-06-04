import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { isProgramType, isProgramStatus } from "@/lib/gicn";

// Create a GICN programme (admin, gicn.manage).
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "gicn.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as {
    title?: string; type?: string; description?: string; startsAt?: string; endsAt?: string;
    capacity?: number | null; location?: string; status?: string;
  };
  const title = (b.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!b.type || !isProgramType(b.type)) return NextResponse.json({ error: "A valid programme type is required." }, { status: 400 });
  const startsAt = new Date(b.startsAt ?? "");
  const endsAt = new Date(b.endsAt ?? "");
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 });
  if (endsAt.getTime() < startsAt.getTime()) return NextResponse.json({ error: "End date cannot be before the start date." }, { status: 400 });
  const status = b.status && isProgramStatus(b.status) ? b.status : "DRAFT";
  let capacity: number | null = null;
  if (b.capacity != null && b.capacity !== ("" as unknown)) {
    capacity = Number(b.capacity);
    if (!Number.isInteger(capacity) || capacity < 0) return NextResponse.json({ error: "Capacity must be a non-negative whole number." }, { status: 400 });
  }

  const program = await db.program.create({
    data: {
      title,
      type: b.type,
      description: (b.description ?? "").trim() || null,
      startsAt,
      endsAt,
      capacity,
      location: (b.location ?? "").trim() || null,
      status,
    },
    select: { id: true },
  });

  await recordAudit({ action: "gicn_program_create", actorLabel: gate.admin.email, targetType: "Program", targetId: program.id, metadata: { title, status } });
  return NextResponse.json({ id: program.id }, { status: 201 });
}
