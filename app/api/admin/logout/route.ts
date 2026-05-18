import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST() {
  await recordAudit({ action: "admin_logout" });
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
