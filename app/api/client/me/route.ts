import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { USER_COOKIE, getClientUserFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const MAX_NAME_LEN = 80;

export async function GET(req: NextRequest) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { name } = (await req.json().catch(() => ({}))) as { name?: string | null };

  if (name === undefined) {
    return NextResponse.json({ error: "name is required (string or null)." }, { status: 400 });
  }
  let nextName: string | null;
  if (name === null) {
    nextName = null;
  } else if (typeof name !== "string") {
    return NextResponse.json({ error: "name must be a string." }, { status: 400 });
  } else {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      nextName = null;
    } else if (trimmed.length > MAX_NAME_LEN) {
      return NextResponse.json({ error: `name must be ≤ ${MAX_NAME_LEN} characters.` }, { status: 400 });
    } else {
      nextName = trimmed;
    }
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { name: nextName },
    select: { id: true, email: true, name: true, imageUrl: true },
  });

  await recordAudit({
    action: "client_profile_update",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { field: "name" },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Defence: require an explicit confirmation payload to avoid CSRF accidents
  const { confirmEmail } = (await req.json().catch(() => ({}))) as { confirmEmail?: string };
  if (!confirmEmail || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Confirmation email did not match the signed-in account." },
      { status: 400 }
    );
  }

  // RecoveryComplaint rows survive for legal retention; just detach them.
  // SavedClassification/SavedRoadmap cascade-delete via the FK definition.
  // MagicLinkToken rows by this email are also cleaned up.
  await db.$transaction([
    db.recoveryComplaint.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    }),
    db.magicLinkToken.deleteMany({ where: { email: user.email } }),
    db.user.delete({ where: { id: user.id } }),
  ]);

  await recordAudit({
    action: "client_account_delete",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
