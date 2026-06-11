import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests for pure, security/correctness-critical logic (no DB, no network).
export default defineConfig({
  test: {
    environment: "node",
    // Unit tests only (top-level). Integration tests (tests/integration/**, which
    // need a real Postgres) run via vitest.integration.config.ts in their own CI job.
    include: ["tests/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
