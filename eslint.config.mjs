import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler advisories (eslint-plugin-react-hooks v7, new in Next 16):
    // keep them VISIBLE but non-blocking. They flag working patterns (mount-fetch
    // effects) and even false-positive on legitimate browser navigation
    // (`window.location.href = …` reported as "value cannot be modified").
    // Genuine correctness rules (unescaped entities, unused vars, etc.) stay errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vendored Google Cloud SDK pulled in for Stitch tooling — not app code
    "googlestich/**",
  ]),
]);

export default eslintConfig;
