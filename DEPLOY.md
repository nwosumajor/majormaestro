# Production Deployment Runbook

This document walks through everything needed to take MajorGBN from "builds locally" to "live for real users." Follow it once per environment (staging + production).

**Estimated time:** 90 minutes if you have all accounts ready; 4–6 hours including DNS/domain verification waits.

---

## Pre-deploy checklist

Before touching any external account, confirm:

- [ ] You can run `npm run check:env` against your intended production env vars and see ≤ 0 errors (warnings are OK).
- [ ] The latest commit on `main` builds with `npm run build` locally.
- [ ] You have admin access to: hosting platform (Vercel), Postgres host (Supabase / Neon / RDS), DNS for your sending domain, Google Cloud Console, S3-compatible object store (if `STORAGE_BACKEND=s3`).
- [ ] You've decided on your production domain. Throughout this guide, replace `yourdomain.com` with it.

---

## 1. Provision Postgres

Pick one:

### Supabase (recommended for early stage)
1. Create a project at https://supabase.com.
2. Project Settings → Database → **Connection string** → copy the **pooled** URL (uses port 6543) for `DATABASE_URL`. The pooler matters for serverless deployments — direct connections will exhaust quotas under load.
3. Save the **direct** URL (port 5432) too — you'll use it for migrations.

### Neon
1. Create a project at https://neon.tech.
2. Copy the **Pooled connection** string for `DATABASE_URL`.
3. Copy the **Direct connection** string for migrations.

### RDS / self-hosted
1. Make sure your DB is reachable from your hosting platform's IP range.
2. Install PgBouncer in transaction mode in front of it.

**Either way:** verify with `psql "$DATABASE_URL" -c '\dt'` — you should connect cleanly (no tables yet, that's fine).

---

## 2. Configure email (Resend)

1. Create an account at https://resend.com.
2. Add your sending domain (e.g., `majormaestro.com`):
   - Click **Domains** → **Add Domain**.
   - Add the SPF, DKIM, and MX records Resend shows you to your DNS provider.
   - Wait for verification (5 min – 24 hr depending on your DNS).
3. Once verified, generate an API key under **API Keys** → **Create**. Copy it.
4. Set env vars:
   - `RESEND_API_KEY` = the key
   - `RESEND_FROM_EMAIL` = `MajorGBN <noreply@yourdomain.com>` (the address must be on the verified domain)
   - `INTERNAL_NOTIFY_EMAIL` = where internal complaint notifications should land (e.g., `forensics@yourdomain.com`)

**Smoke test once deployed:** sign in as admin → dashboard → "Send test to me" button on the Email pipeline card. The audit log should show `email_test`.

---

## 3. Register Google OAuth client

1. Go to https://console.cloud.google.com/apis/credentials.
2. Create a project (or pick an existing one).
3. Configure the **OAuth consent screen** first:
   - User type: **External** (unless you're locked to a Workspace org)
   - Scopes: `openid`, `email`, `profile` (no others needed)
   - Test users: add your own email while still in "Testing" status
   - Publish when ready (this triggers Google's verification process for "External" apps — may take a week if you want unrestricted sign-in)
4. **Create credentials** → **OAuth client ID** → **Web application**.
5. Authorised redirect URIs (one per environment):
   - `https://yourdomain.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (local dev)
6. Copy:
   - `GOOGLE_CLIENT_ID` (ends in `.apps.googleusercontent.com`)
   - `GOOGLE_CLIENT_SECRET`
7. **Optional:** if you want to lock admin sign-ins to a Workspace, set `ADMIN_GOOGLE_DOMAIN=yourcompany.com`. Otherwise admins can sign in via any Google account that matches an existing `AdminUser` row.

---

## 4. Provision S3 (or Cloudflare R2 / MinIO)

Only required if you're moving off local disk — recommended for any multi-instance deployment.

### AWS S3
1. Create a bucket. Block all public access. Enable default encryption (SSE-S3 or SSE-KMS).
2. Create an IAM user with policy limited to `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject` on `arn:aws:s3:::your-bucket/*`.
3. Generate an access key. Set:
   - `STORAGE_BACKEND=s3`
   - `S3_BUCKET=your-bucket-name`
   - `S3_REGION=eu-west-1` (or wherever)
   - `S3_ACCESS_KEY_ID=AKIA…`
   - `S3_SECRET_ACCESS_KEY=…`

### Cloudflare R2
1. Create a bucket at https://dash.cloudflare.com → R2.
2. Create an API token with **Object Read & Write** on the bucket.
3. Set the same vars as above, PLUS:
   - `S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com`

### If you have existing local files
After flipping to S3, run:
```bash
npm run migrate:uploads-to-s3 -- --dry-run   # preview
npm run migrate:uploads-to-s3                # do it
```
The script reads each `UploadedDocument` row with `storageBackend="local"`, uploads the file to S3, then flips the column. Idempotent — safe to re-run.

---

## 5. Generate the bootstrap secrets

Run locally:

```bash
node -e "console.log('ADMIN_SESSION_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(24).toString('hex'))"
node -e "console.log('ADMIN_PASSWORD=' + require('crypto').randomBytes(16).toString('base64url'))"
```

Save these to your password manager. `ADMIN_PASSWORD` is used **once** to bootstrap the first admin — after the first login, it's ignored.

---

## 6. Set up Sentry (optional but recommended)

1. Create a project at https://sentry.io. Pick the **Next.js** platform.
2. Copy the DSN.
3. Set:
   - `SENTRY_DSN` (server-side errors)
   - `NEXT_PUBLIC_SENTRY_DSN` (client-side errors — usually same value)
   - `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (only needed if you want source maps uploaded at build time)

The integration is no-op when `SENTRY_DSN` is unset.

---

## 7. Deploy to Vercel

1. Push to GitHub.
2. Import the repo at https://vercel.com/new.
3. Framework preset: **Next.js**. Build command: `npm run build`. Output: default.
4. Set **all** env vars under Settings → Environment Variables. Copy from `.env.example` as the canonical list. Use the **direct** Postgres URL here, NOT the pooled one — see step 8 for the pooled URL.
5. **Important:** before the first deploy, comment out the `prebuild` script in `package.json` if you haven't set all env vars yet (otherwise build will fail on `check:env`). Re-add after first successful deploy.
6. Deploy.

---

## 8. Wire connection pooling

If you're using Supabase / Neon:
- `DATABASE_URL` for the Next.js runtime → **pooled** URL (port 6543 on Supabase, the `-pooler` host on Neon)
- `DIRECT_URL` for migrations → **direct** URL (port 5432)

Edit `prisma/schema.prisma` to add:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

(If you don't, `prisma migrate deploy` will hit the pooler and fail because pooled connections can't run DDL.)

Commit, push, redeploy.

---

## 9. Run the initial migration

From your laptop, against the production DB:

```bash
DATABASE_URL="postgresql://...direct-url..." npx prisma migrate deploy
```

This applies every migration in `prisma/migrations/` in order. The first run will create all 17 tables.

---

## 10. Bootstrap the first admin

1. Visit `https://yourdomain.com/admin/login`.
2. Enter ANY email you'll use as the founder admin (e.g., `you@yourdomain.com`).
3. Password = the `ADMIN_PASSWORD` you generated in step 5.
4. The first `AdminUser` row is created automatically with `role="owner"`.
5. **Immediately** visit `/admin/account` and:
   - Change your password to something memorable (your old `ADMIN_PASSWORD` is now ignored anyway, but it's a habit worth keeping clean).
   - Enable 2FA. Scan the QR with your authenticator app. Save the recovery codes in your password manager.
6. From `/admin/users`, add any teammates (they sign in via password OR Google OAuth, depending on whether `ADMIN_GOOGLE_DOMAIN` is set).

---

## 11. Verify cron is scheduled

Vercel's free tier supports cron. The schedule is in `vercel.json`:
- `*/5 * * * *` → `/api/cron/webhooks/retry`
- `0 4 * * *` → `/api/cron/cleanup`

Vercel passes `Authorization: Bearer <CRON_SECRET>` automatically — make sure `CRON_SECRET` is set in Vercel env.

Verify in Vercel dashboard → Settings → Cron Jobs. Each should show "Last execution: …" after a few minutes.

**If you're NOT on Vercel:** wire any external scheduler (GitHub Actions, cron-job.org, your CI):
```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/webhooks/retry
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/cleanup
```

---

## 12. Configure backups

### Daily Postgres backup

On a host that has access to `DATABASE_URL` and `pg_dump`:

```bash
# /etc/cron.d/ms2app-backup
30 3 * * *  cd /app && DATABASE_URL="..." BACKUP_S3_BUCKET=gbn-backups bash scripts/backup-db.sh >> /var/log/gbn-backup.log 2>&1
```

If you're on Supabase / Neon, **also** enable their built-in daily backups in the dashboard — `scripts/backup-db.sh` is a belt-and-braces second copy.

### Test a restore (do this before you need it)

```bash
# In a scratch database
gunzip < backups/ms2app-*-latest.sql.gz | psql "postgresql://...scratch-db..."
```

---

## 13. DNS + custom domain

In Vercel → Settings → Domains:
1. Add `yourdomain.com` and `www.yourdomain.com`.
2. Add the CNAME / A records Vercel shows to your DNS provider.
3. Wait for SSL provisioning (usually <5 min).
4. Update `NEXT_PUBLIC_APP_URL` env var to the final URL (no trailing slash).

---

## 14. Verify in production

Run through `LAUNCH-CHECKLIST.md`. Every checkbox must pass before you announce.

---

## Operational reference

### Common operations once live

**Rotate `ADMIN_SESSION_SECRET`** (kicks all admins out, invalidates 2FA secrets too):
1. Generate a new 96-char hex value.
2. Update env var in Vercel.
3. Redeploy.
4. Each admin signs in again. **NOTE:** their `totpSecret` was AES-256-GCM-encrypted with the old secret — they'll need to disable + re-enable 2FA. Plan a maintenance window.

**Rotate `CRON_SECRET`**: trivial. Update env var, redeploy. Cron schedulers using the new value resume immediately.

**Switch storage from local to S3**:
1. Set the `S3_*` env vars + `STORAGE_BACKEND=s3`.
2. Redeploy.
3. From a host with prod env: `npm run migrate:uploads-to-s3`. New uploads go to S3; old local files keep working until migrated.

**Force-purge all client sessions** (e.g., suspected token leak):
```sql
UPDATE "Session" SET "revokedAt" = NOW() WHERE "revokedAt" IS NULL;
```

**Investigate a webhook delivery failure**:
1. `/admin/webhooks` → expand the hook → see the deliveries panel.
2. Each failed delivery shows `responseCode` + `responseBody` (first 2000 chars).
3. "Retry now" button re-fires the dead-letter immediately.

### Where to look when something breaks

| Symptom | First place to check |
|---|---|
| Users can't sign in | `/admin/audit` filtered to `admin_login_failed` / `magic_link_request` |
| Emails not arriving | Resend dashboard → Logs. Then `/api/admin/email-test`. |
| Webhooks not firing | `/admin/webhooks` → expand hook → deliveries panel. Check `failCount`. |
| Cron not running | Vercel → Cron Jobs. Check last execution + status. |
| Errors after a deploy | Sentry dashboard → filter by release. |

---

## Pre-launch security review checklist

Before opening to real corporate clients:

- [ ] All env secrets generated with `crypto.randomBytes`, never reused across environments
- [ ] Admin 2FA enabled on every admin account with `role="owner"`
- [ ] Resend sending domain shows green checkmark (SPF + DKIM + DMARC pass)
- [ ] Google OAuth consent screen is published (not "Testing"), with privacy policy + terms URLs filled
- [ ] Postgres SSL connections enforced (`sslmode=require` in `DATABASE_URL`)
- [ ] S3 bucket has public access blocked + bucket policy denies unencrypted PUTs
- [ ] Vercel domain has HSTS preload submitted (https://hstspreload.org/)
- [ ] First production backup completed and verified-restorable
- [ ] CLAUDE.md and DEPLOY.md docs are current
- [ ] Independent security review of `lib/auth.ts` + `lib/sessions.ts` + OAuth callback completed
