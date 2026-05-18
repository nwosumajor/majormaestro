import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const TOUCH_DEBOUNCE_MS = 5 * 60 * 1000; // only update lastUsedAt every 5 minutes

function generateToken(): string {
  return randomBytes(32).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface CreatedSession {
  id: string;
  token: string; // plaintext — set as the cookie value
  expiresAt: Date;
}

export async function createClientSession(userId: string, ctx: SessionContext): Promise<CreatedSession> {
  if (!db) throw new Error("Database unavailable.");
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await db.session.create({
    data: {
      tokenHash,
      userId,
      userAgent: ctx.userAgent?.slice(0, 500) ?? null,
      ipAddress: ctx.ipAddress ?? null,
      expiresAt,
    },
  });
  return { id: session.id, token, expiresAt };
}

export interface VerifiedSession {
  sessionId: string;
  userId: string;
}

export async function verifySession(token: string | undefined): Promise<VerifiedSession | null> {
  if (!db || !token) return null;
  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({ where: { tokenHash } });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  // Debounced touch to keep lastUsedAt fresh without writing on every request
  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_DEBOUNCE_MS) {
    db.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch((err) => console.error("[sessions] touch failed:", err));
  }

  return { sessionId: session.id, userId: session.userId };
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  if (!db) return false;
  const result = await db.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function revokeSessionByToken(token: string): Promise<void> {
  if (!db) return;
  const tokenHash = hashToken(token);
  await db.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForUser(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  if (!db) return 0;
  const where: { userId: string; revokedAt: null; id?: { not: string } } = {
    userId,
    revokedAt: null,
  };
  if (exceptSessionId) where.id = { not: exceptSessionId };
  const result = await db.session.updateMany({ where, data: { revokedAt: new Date() } });
  return result.count;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export async function listSessionsForUser(
  userId: string,
  currentSessionId: string | null
): Promise<SessionSummary[]> {
  if (!db) return [];
  const sessions = await db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });
  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    current: s.id === currentSessionId,
  }));
}
