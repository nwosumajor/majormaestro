import { NextRequest, NextResponse } from "next/server";
import { getClientUserFromRequest } from "@/lib/auth";
import { revokeAllSessionsForUser } from "@/lib/sessions";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Keep the current session alive — caller is signed in on this device.
  const revoked = await revokeAllSessionsForUser(user.id, user.sessionId);

  await recordAudit({
    action: "session_revoke_all_others",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { revoked },
  });

  return NextResponse.json({ success: true, revoked });
}
