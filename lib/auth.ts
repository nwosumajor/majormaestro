import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCb);

export const ADMIN_COOKIE = "gbn_admin";
export const USER_COOKIE = "gbn_user";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const USER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days for client sessions
const SCRYPT_KEY_LEN = 64;
export const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to a string of at least 32 characters.");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// ─── Password hashing (scrypt) ────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, SCRYPT_KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

// ─── Session tokens ───────────────────────────────────────────────────────

export function mintAdminToken(userId: string): string {
  const issuedAt = Date.now().toString(36);
  return `${userId}.${issuedAt}.${sign(`admin:${userId}:${issuedAt}`)}`;
}

export interface DecodedToken {
  userId: string;
  issuedAt: number;
}

export function decodeAdminToken(token: string | undefined): DecodedToken | null {
  if (!token) return null;
  const [userId, issuedAt, sig] = token.split(".");
  if (!userId || !issuedAt || !sig) return null;
  const expected = sign(`admin:${userId}:${issuedAt}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued) || Date.now() - issued >= MAX_AGE_SECONDS * 1000 || issued > Date.now()) {
    return null;
  }
  return { userId, issuedAt: issued };
}

export function verifyAdminToken(token: string | undefined): boolean {
  return decodeAdminToken(token) !== null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

// ─── Lookup admin from request / cookies ─────────────────────────────────

interface AdminUserSummary {
  id: string;
  email: string;
  role: string;
  totpEnabled: boolean;
}

export async function getAdminFromRequest(req: NextRequest): Promise<AdminUserSummary | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const decoded = decodeAdminToken(token);
  if (!decoded || !db) return null;
  const user = await db.adminUser.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, totpEnabled: true, tokenInvalidBefore: true },
  });
  if (!user) return null;
  // Per-admin revocation: tokens issued before the cutoff are dead.
  if (user.tokenInvalidBefore && decoded.issuedAt < user.tokenInvalidBefore.getTime()) return null;
  return { id: user.id, email: user.email, role: user.role, totpEnabled: user.totpEnabled };
}

export async function getAdminFromCookies(): Promise<AdminUserSummary | null> {
  if (!db) return null;
  const jar = await cookies();
  const decoded = decodeAdminToken(jar.get(ADMIN_COOKIE)?.value);
  if (!decoded) return null;
  const user = await db.adminUser.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, totpEnabled: true, tokenInvalidBefore: true },
  });
  if (!user) return null;
  if (user.tokenInvalidBefore && decoded.issuedAt < user.tokenInvalidBefore.getTime()) return null;
  return { id: user.id, email: user.email, role: user.role, totpEnabled: user.totpEnabled };
}

/**
 * Step-up re-authentication for destructive actions (retention purges, deleting
 * an admin). Requires a fresh credential even within a live session: the current
 * TOTP code if 2FA is enrolled, otherwise the account password.
 */
export async function verifyStepUp(
  adminId: string,
  creds: { code?: string; password?: string }
): Promise<boolean> {
  if (!db) return false;
  const user = await db.adminUser.findUnique({
    where: { id: adminId },
    select: { passwordHash: true, totpEnabled: true, totpSecret: true },
  });
  if (!user) return false;
  if (user.totpEnabled && user.totpSecret) {
    const code = creds.code?.trim();
    if (!code) return false;
    const { verifyCode, decryptSecret } = await import("@/lib/totp");
    return verifyCode(decryptSecret(user.totpSecret), code);
  }
  if (!creds.password) return false;
  return verifyPassword(creds.password, user.passwordHash);
}

// ─── Recovery codes ──────────────────────────────────────────────────────

function randomCode(): string {
  // 10 char codes in groups of 5, e.g. "X8KQM-7T4PR"
  const bytes = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += RECOVERY_CODE_ALPHABET[bytes[i] % RECOVERY_CODE_ALPHABET.length];
  }
  return `${s.slice(0, 5)}-${s.slice(5, 10)}`;
}

export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function generateRecoveryCodes(): Promise<{ plain: string[]; hashes: string[] }> {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const code = randomCode();
    plain.push(code);
    hashes.push(await hashPassword(normalizeRecoveryCode(code)));
  }
  return { plain, hashes };
}

/** Tries each stored hash; if one matches, returns the index so the caller can mark it consumed. */
async function findRecoveryCodeIndex(stored: string[], input: string): Promise<number> {
  const norm = normalizeRecoveryCode(input);
  if (norm.length < 8) return -1;
  for (let i = 0; i < stored.length; i++) {
    if (await verifyPassword(norm, stored[i])) return i;
  }
  return -1;
}

// ─── Bootstrap & login helpers ───────────────────────────────────────────

const BOOTSTRAP_EMAIL = "admin@majormaestro.com";

export type LoginResult =
  | { ok: true; user: AdminUserSummary; recoveryCodeUsed?: boolean; remainingRecoveryCodes?: number }
  | { ok: false; reason: "invalid" | "totp_required" | "totp_invalid" };

export async function tryLogin(
  email: string,
  password: string,
  totp?: string,
  recoveryCode?: string
): Promise<LoginResult> {
  if (!db) return { ok: false, reason: "invalid" };
  const normEmail = email.trim().toLowerCase();
  if (!normEmail || !password) return { ok: false, reason: "invalid" };

  // Bootstrap: if no users exist yet and ADMIN_PASSWORD is set, create the first user
  const userCount = await db.adminUser.count();
  if (userCount === 0 && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    const passwordHash = await hashPassword(password);
    const created = await db.adminUser.create({
      data: {
        email: normEmail || BOOTSTRAP_EMAIL,
        passwordHash,
        role: "owner",
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, role: true, totpEnabled: true },
    });
    return { ok: true, user: created };
  }

  const user = await db.adminUser.findUnique({ where: { email: normEmail } });
  if (!user) return { ok: false, reason: "invalid" };
  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) return { ok: false, reason: "invalid" };

  let recoveryUsed = false;
  let remainingRecoveryCodes: number | undefined;

  if (user.totpEnabled && user.totpSecret) {
    // Accept a recovery code as an alternative second factor
    if (recoveryCode && user.recoveryCodeHashes.length > 0) {
      const idx = await findRecoveryCodeIndex(user.recoveryCodeHashes, recoveryCode);
      if (idx === -1) return { ok: false, reason: "totp_invalid" };
      const remaining = [...user.recoveryCodeHashes];
      remaining.splice(idx, 1);
      await db.adminUser.update({
        where: { id: user.id },
        data: { recoveryCodeHashes: remaining },
      });
      recoveryUsed = true;
      remainingRecoveryCodes = remaining.length;
    } else {
      if (!totp) return { ok: false, reason: "totp_required" };
      const { verifyCode, decryptSecret } = await import("@/lib/totp");
      const secret = decryptSecret(user.totpSecret);
      if (!verifyCode(secret, totp)) return { ok: false, reason: "totp_invalid" };
    }
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return {
    ok: true,
    user: { id: user.id, email: user.email, role: user.role, totpEnabled: user.totpEnabled },
    recoveryCodeUsed: recoveryUsed,
    remainingRecoveryCodes,
  };
}

// ─── Cookie options ───────────────────────────────────────────────────────

export function adminCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

// ─── Client (end-user) session — uses Session table (server-side, revocable) ─

import { verifySession } from "@/lib/sessions";

export function userCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_MAX_AGE_SECONDS,
  };
}

interface ClientUserSummary {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  sessionId: string;
}

export async function getClientUserFromCookies(): Promise<ClientUserSummary | null> {
  if (!db) return null;
  const jar = await cookies();
  const session = await verifySession(jar.get(USER_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, imageUrl: true },
  });
  if (!user) return null;
  return { ...user, sessionId: session.sessionId };
}

export async function getClientUserFromRequest(req: NextRequest): Promise<ClientUserSummary | null> {
  if (!db) return null;
  const session = await verifySession(req.cookies.get(USER_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, imageUrl: true },
  });
  if (!user) return null;
  return { ...user, sessionId: session.sessionId };
}
