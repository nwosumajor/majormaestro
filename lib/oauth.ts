import { createHash, randomBytes } from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPES = ["openid", "email", "profile"];

export type OAuthMode = "client" | "admin";

export interface GoogleProfile {
  sub: string;       // stable Google user id
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  hd?: string;       // hosted-domain (Workspace domain) when applicable
}

interface OAuthEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getOAuthEnv(req: { headers: Headers; nextUrl: URL }): OAuthEnv {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.");
  }
  // Compute redirect_uri from current request (so dev / prod / preview all work)
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  return {
    clientId,
    clientSecret,
    redirectUri: `${base}/api/auth/google/callback`,
  };
}

// PKCE helpers
function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(24));
}

export function buildAuthUrl(
  env: OAuthEnv,
  state: string,
  challenge: string,
  options: { hostedDomain?: string; loginHint?: string } = {}
): string {
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  if (options.hostedDomain) params.set("hd", options.hostedDomain);
  if (options.loginHint) params.set("login_hint", options.loginHint);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForProfile(
  env: OAuthEnv,
  code: string,
  verifier: string
): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: env.redirectUri,
    }).toString(),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${text.slice(0, 200)}`);
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("No access_token in token response.");

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    const text = await userRes.text().catch(() => "");
    throw new Error(`Google userinfo failed (${userRes.status}): ${text.slice(0, 200)}`);
  }
  const profile = (await userRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) {
    throw new Error("Google profile missing sub or email.");
  }
  return profile;
}

// ─── State cookie helpers ─────────────────────────────────────────────────

export const OAUTH_STATE_COOKIE = "gbn_oauth";
const STATE_MAX_AGE = 60 * 10; // 10 minutes

export interface StatePayload {
  state: string;
  verifier: string;
  mode: OAuthMode;
  next?: string;
}

export function encodeStatePayload(p: StatePayload): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(p)));
}

export function decodeStatePayload(cookie: string): StatePayload | null {
  try {
    const padded = cookie.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string") return null;
    if (parsed.mode !== "client" && parsed.mode !== "admin") return null;
    return parsed as StatePayload;
  } catch {
    return null;
  }
}

export function stateCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_MAX_AGE,
  };
}
