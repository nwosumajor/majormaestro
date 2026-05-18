import { NextRequest, NextResponse } from "next/server";
import { getClientUserFromRequest } from "@/lib/auth";
import { listSessionsForUser } from "@/lib/sessions";

export async function GET(req: NextRequest) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const items = await listSessionsForUser(user.id, user.sessionId);
  return NextResponse.json({ items });
}
