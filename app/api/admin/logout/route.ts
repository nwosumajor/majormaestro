import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  await recordAudit({
    action: "admin_logout",
    actorLabel: admin?.email ?? "admin",
    targetType: admin ? "AdminUser" : undefined,
    targetId: admin?.id,
  });
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
