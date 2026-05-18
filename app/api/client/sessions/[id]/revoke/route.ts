import { NextRequest, NextResponse } from "next/server";
import { getClientUserFromRequest, USER_COOKIE } from "@/lib/auth";
import { revokeSession } from "@/lib/sessions";
import { recordAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await ctx.params;
  const ok = await revokeSession(id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  await recordAudit({
    action: "session_revoke",
    actorLabel: user.email,
    targetType: "Session",
    targetId: id,
    metadata: { self: id === user.sessionId },
  });

  // If the user revoked their current session, clear the cookie as well.
  const res = NextResponse.json({ success: true });
  if (id === user.sessionId) {
    res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return res;
}
