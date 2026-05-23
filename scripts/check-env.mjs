#!/usr/bin/env node
/**
 * Pre-flight environment validator.
 *
 * Usage:
 *   npm run check:env              # uses process env (loaded by your shell)
 *   npm run check:env -- --strict  # fail if any optional warning is present
 *
 * Exits 0 if good, 1 if any required value is missing or invalid.
 *
 * Designed for CI / pre-deploy hooks. Prints a coloured readiness report.
 */

const strict = process.argv.includes("--strict");

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const env = process.env;

const results = { errors: [], warnings: [], ok: [] };

function pass(key, note) {
  results.ok.push({ key, note });
}
function fail(key, msg) {
  results.errors.push({ key, msg });
}
function warn(key, msg) {
  results.warnings.push({ key, msg });
}

function required(key, validate, helpUrl) {
  const v = env[key];
  if (!v || v.trim() === "") {
    fail(key, `not set${helpUrl ? ` — see ${helpUrl}` : ""}`);
    return;
  }
  if (validate) {
    const err = validate(v);
    if (err) {
      fail(key, err);
      return;
    }
  }
  pass(key, `set${v.length > 80 ? ` (${v.length} chars)` : ` (${v.length > 24 ? v.slice(0, 16) + "…" : v})`}`);
}

function optional(key, validate, defaultNote) {
  const v = env[key];
  if (!v || v.trim() === "") {
    warn(key, `not set${defaultNote ? ` — ${defaultNote}` : ""}`);
    return;
  }
  if (validate) {
    const err = validate(v);
    if (err) {
      warn(key, err);
      return;
    }
  }
  pass(key, "set");
}

// ─── AI ────────────────────────────────────────────────────────────────────
required("ANTHROPIC_API_KEY", (v) => (v.startsWith("sk-ant-") ? null : "should start with 'sk-ant-'"), "https://console.anthropic.com/settings/keys");

// ─── Database ──────────────────────────────────────────────────────────────
required(
  "DATABASE_URL",
  (v) => (/^postgres(ql)?:\/\//.test(v) ? null : "must be a postgres:// connection string"),
);

// ─── Public app URL ────────────────────────────────────────────────────────
required(
  "NEXT_PUBLIC_APP_URL",
  (v) => {
    try {
      const u = new URL(v);
      if (env.NODE_ENV === "production" && u.protocol !== "https:") {
        return "must use https:// in production";
      }
      if (v.endsWith("/")) return "should NOT have a trailing slash (some email templates assume no slash)";
      return null;
    } catch {
      return "not a valid URL";
    }
  },
);

// ─── Admin auth ────────────────────────────────────────────────────────────
// ADMIN_PASSWORD is bootstrap-only (ignored once an AdminUser exists). Require strong length in production; warn otherwise.
if (env.NODE_ENV === "production") {
  required("ADMIN_PASSWORD", (v) => (v.length >= 16 ? null : "must be ≥16 characters in production (one-time bootstrap value)"));
} else {
  optional("ADMIN_PASSWORD", (v) => (v.length >= 12 ? null : "shorter than 12 chars — fine for local dev, but production must be ≥16"));
}
required("ADMIN_SESSION_SECRET", (v) => (v.length >= 32 ? null : "must be ≥32 characters; generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""));

// ─── Email (Resend) ────────────────────────────────────────────────────────
optional("RESEND_API_KEY", (v) => (v.startsWith("re_") ? null : "should start with 're_'"), "no emails will send; magic-link sign-in returns a dev URL in non-prod");
optional("RESEND_FROM_EMAIL", (v) => {
  // Either "Name <addr@host>" or just "addr@host"
  const re = /^(?:.+ <[^@\s>]+@[^@\s>]+\.[^@\s>]+>|[^@\s]+@[^@\s]+\.[^@\s]+)$/;
  return re.test(v) ? null : "must be 'Name <addr@host>' or 'addr@host'";
}, "defaults to MajorGBN <noreply@majormaestro.com>");
optional("INTERNAL_NOTIFY_EMAIL", (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "not a valid email"), "internal-team complaint notifications go to a fallback address");

// ─── Cron ──────────────────────────────────────────────────────────────────
optional("CRON_SECRET", (v) => (v.length >= 24 ? null : "should be ≥24 characters"), "cron retry + cleanup endpoints will reject all calls");

// ─── Google OAuth ──────────────────────────────────────────────────────────
const googleId = env.GOOGLE_CLIENT_ID;
const googleSecret = env.GOOGLE_CLIENT_SECRET;
if (googleId || googleSecret) {
  required("GOOGLE_CLIENT_ID", (v) => (v.endsWith(".apps.googleusercontent.com") ? null : "should end with '.apps.googleusercontent.com'"));
  required("GOOGLE_CLIENT_SECRET");
  optional("ADMIN_GOOGLE_DOMAIN", (v) => (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v) ? null : "should look like a domain (no leading @)"), "admin Google sign-in accepts any domain that matches an existing AdminUser email");
} else {
  warn("GOOGLE_CLIENT_ID", "OAuth disabled — magic-link sign-in only. To enable Google: https://console.cloud.google.com/apis/credentials");
}

// ─── Storage ───────────────────────────────────────────────────────────────
const storage = (env.STORAGE_BACKEND ?? "local").toLowerCase();
if (storage === "s3") {
  required("S3_BUCKET");
  required("S3_REGION");
  required("S3_ACCESS_KEY_ID");
  required("S3_SECRET_ACCESS_KEY");
  optional("S3_ENDPOINT", (v) => (/^https?:\/\//.test(v) ? null : "must include scheme"), "AWS S3 default endpoint");
} else if (storage === "local") {
  warn("STORAGE_BACKEND", "set to 'local' — uploads go to ./uploads/. Switch to 's3' before multi-instance deployment.");
} else {
  fail("STORAGE_BACKEND", `unknown value '${env.STORAGE_BACKEND}' (expected 'local' or 's3')`);
}

// ─── Retention (optional) ──────────────────────────────────────────────────
optional("RETENTION_DAYS", (v) => (Number.isInteger(+v) && +v > 0 ? null : "must be a positive integer"), "defaults to 1095 (3 years)");
optional("AUDIT_LOG_RETENTION_DAYS", (v) => (Number.isInteger(+v) && +v > 0 ? null : "must be a positive integer"), "defaults to 730 (2 years)");

// ─── Sentry (optional) ─────────────────────────────────────────────────────
optional("SENTRY_DSN", (v) => (/^https:\/\/.+@.+\.ingest\.sentry\.io\//.test(v) ? null : "should look like https://<key>@<org>.ingest.sentry.io/<project>"), "error tracking disabled");

// ─── Cross-field validation ────────────────────────────────────────────────
const issues = [];
if (env.NODE_ENV === "production") {
  if (env.NEXT_PUBLIC_APP_URL?.includes("localhost")) {
    issues.push("NEXT_PUBLIC_APP_URL points at localhost while NODE_ENV=production — OAuth redirects will fail.");
  }
  if (!env.RESEND_API_KEY) {
    issues.push("RESEND_API_KEY not set in production — no client emails will be delivered (intake confirmations, status updates, magic links).");
  }
  if (!env.CRON_SECRET) {
    issues.push("CRON_SECRET not set in production — cron endpoints will always 401 (webhook retries + cleanup will not run).");
  }
  if (storage === "local") {
    issues.push("STORAGE_BACKEND=local in production — uploads will not survive container restarts or scale-out.");
  }
}

// ─── Report ────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}MajorGBN pre-flight environment check${RESET} ${DIM}(NODE_ENV=${env.NODE_ENV ?? "<unset>"})${RESET}\n`);

for (const r of results.ok) {
  console.log(`  ${GREEN}✓${RESET} ${r.key}  ${DIM}${r.note}${RESET}`);
}
for (const r of results.warnings) {
  console.log(`  ${YELLOW}⚠${RESET} ${r.key}  ${YELLOW}${r.msg}${RESET}`);
}
for (const r of results.errors) {
  console.log(`  ${RED}✗${RESET} ${r.key}  ${RED}${r.msg}${RESET}`);
}

if (issues.length > 0) {
  console.log(`\n${BOLD}${RED}Production safety issues:${RESET}`);
  for (const i of issues) console.log(`  ${RED}✗${RESET} ${i}`);
}

console.log("");
console.log(`  ${results.ok.length} OK · ${results.warnings.length} warnings · ${results.errors.length} errors${issues.length ? ` · ${issues.length} production safety issues` : ""}\n`);

const failed = results.errors.length > 0 || issues.length > 0 || (strict && results.warnings.length > 0);
process.exit(failed ? 1 : 0);
