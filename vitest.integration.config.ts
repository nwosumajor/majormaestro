import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Integration tests — exercise the real DB-touching logic (scholarship lifecycle,
// ownership isolation) against a live Postgres. Run in a single process so DB
// state doesn't race across files. Requires DATABASE_URL (the CI job sets it to
// a Postgres service container).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
