import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests for pure, security/correctness-critical logic (no DB, no network).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
