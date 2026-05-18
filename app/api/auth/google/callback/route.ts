import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  decodeStatePayload,
  exchangeCodeForProfile,
  getOAuthEnv,
  type GoogleProfile,
} from "@/lib/oauth";
import { db } from "@/lib/db";
import {
  ADMIN_COOKIE,
  USER_COOKIE,
  adminCookieOptions,
  mintAdminToken,
  userCookieOptions,
} from "@/lib/auth";
import { createClientSession } from "@/lib/sessions";
import { recordAudit } from "@/lib/audit";

function errorRedirect(req: NextRequest, message: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?error=${encodeURIComponent(message)}`;
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

function clientErrorRedirect(req: NextRequest, message: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = `?signin_error=${encodeURIComponent(message)}`;
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  // OAuth-level errors come back as ?error=access_denied etc.
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    return clientErrorRedirect(req, `Google sign-in cancelled (${oauthError}).`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const stateCookieValue = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !stateParam || !stateCookieValue) {
    return clientErrorRedirect(req, "Sign-in session expired. Please try again.");
  }

  const payload = decodeStatePayload(stateCookieValue);
  if (!payload || payload.state !== stateParam) {
    return clientErrorRedirect(req, "Sign-in verification failed. Please try again.");
  }

  let env, profile: GoogleProfile;
  try {
    env = getOAuthEnv(req);
    profile = await exchangeCodeForProfile(env, code, payload.verifier);
  } catch (err) {
    console.error("[oauth/callback]", err);
    return payload.mode === "admin"
      ? errorRedirect(req, "Google sign-in failed.")
      : clientErrorRedirect(req, "Google sign-in failed.");
  }

  if (!db) {
    return payload.mode === "admin"
      ? errorRedirect(req, "Database unavailable.")
      : clientErrorRedirect(req, "Database unavailable.");
  }

  const normEmail = profile.email.toLowerCase();

  // ─── Admin path ────────────────────────────────────────────────────────
  if (payload.mode === "admin") {
    // Domain check
    const requiredDomain = process.env.ADMIN_GOOGLE_DOMAIN?.trim().toLowerCase();
    if (requiredDomain) {
      const allowed = profile.hd?.toLowerCase() === requiredDomain
        || normEmail.endsWith(`@${requiredDomain}`);
      if (!allowed) {
        return errorRedirect(req, `Sign-in restricted to @${requiredDomain} accounts.`);
      }
    }

    const admin = await db.adminUser.findFirst({
      where: { OR: [{ googleSub: profile.sub }, { email: normEmail }] },
    });
    if (!admin) {
      await recordAudit({
        action: "admin_google_signin_rejected",
        actorLabel: normEmail,
        metadata: { reason: "no_matching_admin_user" },
      });
      return errorRedirect(req, "No admin account is linked to this Google address. Ask an owner to create one.");
    }
    // Bind googleSub if not already set
    if (!admin.googleSub) {
      await db.adminUser.update({
        where: { id: admin.id },
        data: { googleSub: profile.sub, lastLoginAt: new Date() },
      });
    } else if (admin.googleSub !== profile.sub) {
      await recordAudit({
        action: "admin_google_signin_rejected",
        actorLabel: normEmail,
        metadata: { reason: "google_sub_mismatch" },
      });
      return errorRedirect(req, "This admin account is linked to a different Google identity.");
    } else {
      await db.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });
    }

    await recordAudit({
      action: "admin_login_google",
      actorLabel: admin.email,
      targetType: "AdminUser",
      targetId: admin.id,
    });

    const target = payload.next?.startsWith("/admin") ? payload.next : "/admin";
    const url = req.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    const res = NextResponse.redirect(url);
    res.cookies.set(ADMIN_COOKIE, mintAdminToken(admin.id), adminCookieOptions());
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // ─── Client path ───────────────────────────────────────────────────────
  let user = await db.user.findFirst({
    where: { OR: [{ googleSub: profile.sub }, { email: normEmail }] },
  });

  if (user) {
    // Update profile fields and bind sub if email-first match
    user = await db.user.update({
      where: { id: user.id },
      data: {
        googleSub: profile.sub,
        email: normEmail,
        name: profile.name ?? user.name,
        imageUrl: profile.picture ?? user.imageUrl,
        emailVerified: profile.email_verified ? new Date() : user.emailVerified,
        lastLoginAt: new Date(),
      },
    });
  } else {
    user = await db.user.create({
      data: {
        googleSub: profile.sub,
        email: normEmail,
        name: profile.name ?? null,
        imageUrl: profile.picture ?? null,
        emailVerified: profile.email_verified ? new Date() : null,
        lastLoginAt: new Date(),
      },
    });
  }

  // Auto-link complaints by email
  const linkResult = await db.recoveryComplaint.updateMany({
    where: { contactEmail: { equals: normEmail, mode: "insensitive" }, userId: null },
    data: { userId: user.id },
  });

  await recordAudit({
    action: "client_login_google",
    actorLabel: user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { linkedComplaints: linkResult.count, isNew: !user.lastLoginAt },
  });

  const target = payload.next && payload.next.startsWith("/") ? payload.next : "/client/dashboard";
  const url = req.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  const res = NextResponse.redirect(url);
  const session = await createClientSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip"),
  });
  res.cookies.set(USER_COOKIE, session.token, userCookieOptions());
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
