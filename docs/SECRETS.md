# Secrets management — Doppler runbook

> Source of truth for all secrets is **Doppler**. Doppler **syncs into Vercel**
> env vars, so the app keeps reading `process.env.*` unchanged (no code change,
> no cold-start cost). Local dev injects secrets via the Doppler CLI instead of
> `.env` files.
>
> Last updated: 2026-06-07

```
            ┌─────────────┐   sync (auto)   ┌──────────────┐
 you  ───►  │   Doppler   │ ───────────────►│  Vercel env  │ ──► app (process.env)
 (UI/CLI)   │ (source of  │                 │ (prod/preview)│
            │   truth)    │ ──► doppler run ──► local dev
            └─────────────┘
```

## 1. Secret inventory

**True secrets** (protect; rotatable; mark *Sensitive* in Vercel if any stay there):

| Secret | Used for | Rotate by |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Postgres (Supabase) | Supabase → DB password |
| `ANTHROPIC_API_KEY` | AI features + PR reviewer | console.anthropic.com |
| `RESEND_API_KEY` | Email | Resend dashboard |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google Cloud console |
| `ADMIN_SESSION_SECRET` | Admin cookie HMAC (rotating signs out all admins) | regenerate ≥32-char hex |
| `ADMIN_PASSWORD` | First-admin bootstrap only — **remove once an admin exists** | n/a |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Document storage (Backblaze B2) | Backblaze app keys |
| `CRON_SECRET` | Cron endpoint auth | regenerate |
| `GBN_WEBHOOK_RECEIVER_SECRET` | Webhook receiver verification | regenerate + update webhook |
| `SENTRY_AUTH_TOKEN` | Source-map upload (build) | Sentry |
| `SLACK_WEBHOOK_URL` | Optional Slack relay | Slack |

**Config / low-sensitivity** (manage in Doppler too, but not high-risk):
`GOOGLE_CLIENT_ID`, `RESEND_FROM_EMAIL`, `INTERNAL_NOTIFY_EMAIL`, `STORAGE_BACKEND`,
`S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`,
`SENTRY_ENABLE_DEV`, `ADMIN_GOOGLE_DOMAIN`, `RETENTION_DAYS`, `AUDIT_LOG_RETENTION_DAYS`.

**Public (NOT secret — inlined into the browser bundle at build):**
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`. Keep in Doppler for completeness, but
they are intentionally exposed client-side.

> ⚠️ `NEXT_PUBLIC_*` are read at **build** time — ensure the Doppler→Vercel sync has
> them present before a build, or the browser bundle inlines empty values.

## 2. One-time setup

1. **Install + log in:** `brew install dopplerhq/cli/doppler` (or `curl -Ls https://cli.doppler.com/install.sh | sh`), then `doppler login`.
2. **Create the project** `majormaestro` (dashboard or `doppler projects create majormaestro`). Doppler gives you configs `dev`, `stg`, `prd`.
3. **Load secrets into Doppler** — set each from its **authoritative source** (the provider dashboards above), not from the stale local files:
   - Bulk from a known-good file: `doppler secrets upload .env.local --config dev`
   - Or per secret: `doppler secrets set ANTHROPIC_API_KEY --config prd`
   - Set production values in `prd`, local/preview values in `dev`.
   > `vercel env pull` returns Sensitive vars blank, so re-enter those (DB, S3, keys) from their origin.
4. **Sync to Vercel** (the integration): Doppler dashboard → project → **Integrations → Vercel** → authorize → select the `majormaestro` Vercel project → map **`prd` → Production**, **`dev` → Preview/Development** → enable auto-sync. Doppler now pushes to Vercel env on every change. **Redeploy** for changes to take effect.
5. **Local dev:** `doppler setup` (reads `doppler.yaml` → project `majormaestro`, config `dev`), then run `npm run dev:doppler` (= `doppler run -- next dev`). No more `.env.local` needed.
6. **GitHub Actions:** the AI reviewer needs `ANTHROPIC_API_KEY` (and the optional retry cron needs `CRON_SECRET`). Either keep those two as GitHub repo secrets (simplest, already set), or sync them with a **Doppler service token** + the Doppler GitHub Action. Two low-risk secrets — repo secrets are fine.

## 3. Cleanup (after the sync is verified working)

- **Delete the plaintext prod copy:** `rm .env.production.local` ← biggest hygiene win; it should never have lived on disk.
- Stop using `.env.local` for dev (use `doppler run`); delete it or keep only non-secret local overrides.
- `.env.sentry-build-plugin` → move its token into Doppler, then delete.
- Confirm `.gitignore` still covers `.env*` (it does) — never commit env files.
- **GitHub PAT** in `~/.git-credentials` is plaintext — rotate it at GitHub and consider `gh auth login` (keychain) instead.

## 4. Rotation

- **Now (exposed/at-risk):** `ANTHROPIC_API_KEY` (already rotated), the GitHub PAT, and `ADMIN_SESSION_SECRET` if it was ever shared (note: rotating it signs out all admins).
- **Going forward:** rotate in Doppler → it auto-syncs to Vercel → **redeploy**. Set a recurring reminder for high-value secrets (DB, S3, Resend, Anthropic), e.g. quarterly. Doppler keeps version history for rollback + an audit log of who changed what.

## 5. Verify the migration

After the Vercel integration syncs and you redeploy:
- Vercel → Settings → Env Vars shows the values managed by Doppler.
- Production health: `https://majormaestro.com/` → 200; a document upload returns `storageBackend:"s3"`; sign-in/email flows work.
- Local: `npm run dev:doppler` boots with secrets injected (no `.env.local`).
