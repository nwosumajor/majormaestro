import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const me = await getClientUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.googleSub) {
    return NextResponse.json({ error: "No Google account is linked." }, { status: 400 });
  }

  // Lock-out guard: a user who has only ever signed in via Google with no email-verification
  // history should NOT disconnect, because they can't get back in. We require email_verified
  // to be set (proof they can receive mail at this address for magic-link recovery).
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Verify your email via a magic-link sign-in first, otherwise disconnecting Google would lock you out." },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { googleSub: null },
  });

  await recordAudit({
    action: "client_disconnect_google",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
  });

  return NextResponse.json({ success: true });
}
