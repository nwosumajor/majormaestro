import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  buildAuthUrl,
  encodeStatePayload,
  generatePkce,
  generateState,
  getOAuthEnv,
  stateCookieOptions,
  type OAuthMode,
} from "@/lib/oauth";

export function GET(req: NextRequest) {
  let env;
  try {
    env = getOAuthEnv(req);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OAuth not configured." },
      { status: 503 }
    );
  }

  const modeParam = req.nextUrl.searchParams.get("mode");
  const mode: OAuthMode = modeParam === "admin" ? "admin" : "client";
  const rawNext = req.nextUrl.searchParams.get("next");
  // Only accept same-site paths
  const next = rawNext && /^\/[^/]/.test(rawNext) ? rawNext : undefined;

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  const hostedDomain = mode === "admin" ? process.env.ADMIN_GOOGLE_DOMAIN || undefined : undefined;
  const authUrl = buildAuthUrl(env, state, challenge, { hostedDomain });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(
    OAUTH_STATE_COOKIE,
    encodeStatePayload({ state, verifier, mode, next }),
    stateCookieOptions()
  );
  return res;
}
