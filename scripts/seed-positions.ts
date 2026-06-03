/**
 * Seed the system position catalog (userId = null) from the canonical
 * SEED_POSITIONS list. Idempotent: only inserts when no system positions exist,
 * so it never changes the ids of already-seeded rows (batches reference them).
 *
 * Run (env sourced per CLAUDE.md):
 *   set -a && source .env.local && set +a
 *   node scripts/seed-positions.ts
 */
import { PrismaClient } from "@prisma/client";
import { SEED_POSITIONS } from "../lib/classificationSchema.ts";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.position.count({ where: { userId: null } });
  if (existing > 0) {
    console.log(`[seed-positions] ${existing} system positions already present — skipping.`);
    return;
  }
  const result = await prisma.position.createMany({
    data: SEED_POSITIONS.map((p) => ({
      industryCategory: p.industryCategory,
      departmentName: p.departmentName,
      isCustom: false,
      userId: null,
    })),
  });
  console.log(`[seed-positions] Inserted ${result.count} system positions.`);
}

main()
  .catch((e) => {
    console.error("[seed-positions] Failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
