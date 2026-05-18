import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCb);

export const ADMIN_COOKIE = "gbn_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_KEY_LEN = 64;

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
}

export async function getAdminFromRequest(req: NextRequest): Promise<AdminUserSummary | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const decoded = decodeAdminToken(token);
  if (!decoded || !db) return null;
  const user = await db.adminUser.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true },
  });
  return user;
}

export async function getAdminFromCookies(): Promise<AdminUserSummary | null> {
  if (!db) return null;
  const jar = await cookies();
  const decoded = decodeAdminToken(jar.get(ADMIN_COOKIE)?.value);
  if (!decoded) return null;
  return db.adminUser.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true },
  });
}

// ─── Bootstrap & login helpers ───────────────────────────────────────────

const BOOTSTRAP_EMAIL = "admin@majormaestro.com";

export type LoginResult =
  | { ok: true; user: AdminUserSummary }
  | { ok: false; reason: "invalid" | "totp_required" | "totp_invalid" };

export async function tryLogin(
  email: string,
  password: string,
  totp?: string
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
      select: { id: true, email: true, role: true },
    });
    return { ok: true, user: created };
  }

  const user = await db.adminUser.findUnique({ where: { email: normEmail } });
  if (!user) return { ok: false, reason: "invalid" };
  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) return { ok: false, reason: "invalid" };

  if (user.totpEnabled && user.totpSecret) {
    if (!totp) return { ok: false, reason: "totp_required" };
    const { verifyCode, decryptSecret } = await import("@/lib/totp");
    const secret = decryptSecret(user.totpSecret);
    if (!verifyCode(secret, totp)) return { ok: false, reason: "totp_invalid" };
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return { ok: true, user: { id: user.id, email: user.email, role: user.role } };
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
