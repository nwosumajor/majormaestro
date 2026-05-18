import { NextRequest, NextResponse } from "next/server";
import { adminCookieOptions, mintAdminToken, tryLogin, ADMIN_COOKIE } from "@/lib/auth";
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
    const { email, password, totp, recoveryCode } = (await req.json()) as {
      email?: string;
      password?: string;
      totp?: string;
      recoveryCode?: string;
    };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const result = await tryLogin(email, password, totp, recoveryCode);
    if (!result.ok) {
      const normEmail = email.trim().toLowerCase();
      if (result.reason === "totp_required") {
        return NextResponse.json(
          { error: "Authenticator code required.", totpRequired: true },
          { status: 401, headers: rateLimitHeaders(rl) }
        );
      }
      if (result.reason === "totp_invalid") {
        await recordAudit({
          action: "admin_login_failed",
          actorLabel: normEmail,
          metadata: { ip, reason: "totp_invalid" },
        });
        return NextResponse.json(
          { error: "Invalid authenticator code.", totpRequired: true },
          { status: 401, headers: rateLimitHeaders(rl) }
        );
      }
      await recordAudit({
        action: "admin_login_failed",
        actorLabel: normEmail,
        metadata: { ip },
      });
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401, headers: rateLimitHeaders(rl) }
      );
    }

    const token = mintAdminToken(result.user.id);
    await recordAudit({
      action: result.recoveryCodeUsed ? "admin_login_recovery_code" : "admin_login_success",
      actorLabel: result.user.email,
      targetType: "AdminUser",
      targetId: result.user.id,
      metadata: { ip, ...(result.recoveryCodeUsed ? { remainingRecoveryCodes: result.remainingRecoveryCodes } : {}) },
    });

    const res = NextResponse.json({
      success: true,
      user: result.user,
      ...(result.recoveryCodeUsed
        ? { recoveryCodeUsed: true, remainingRecoveryCodes: result.remainingRecoveryCodes }
        : {}),
    });
    res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
    return res;
  } catch (err) {
    console.error("[/api/admin/login]", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
