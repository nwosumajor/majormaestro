import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db: PrismaClient | null = (() => {
  if (!process.env.DATABASE_URL) return null;
  try {
    if (globalForPrisma.prisma) return globalForPrisma.prisma;
    const client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    return client;
  } catch {
    console.warn("[db] Failed to initialise Prisma client");
    return null;
  }
})();
