import { NextRequest, NextResponse } from "next/server";
import { adminCookieOptions, adminPasswordMatches, mintAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`admin-login:${ip}`, 5, 15 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait and try again." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const { password } = (await req.json()) as { password?: string };
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (!adminPasswordMatches(password)) {
      await recordAudit({
        action: "admin_login_failed",
        actorLabel: ip,
        metadata: { ip },
      });
      return NextResponse.json(
        { error: "Invalid password." },
        { status: 401, headers: rateLimitHeaders(rl) }
      );
    }

    const token = mintAdminToken();
    await recordAudit({ action: "admin_login_success", actorLabel: ip });

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
    return res;
  } catch (err) {
    console.error("[/api/admin/login]", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
