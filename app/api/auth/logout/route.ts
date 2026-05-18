import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE } from "@/lib/auth";
import { revokeSessionByToken } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(USER_COOKIE)?.value;
  if (token) {
    await revokeSessionByToken(token).catch(() => undefined);
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
