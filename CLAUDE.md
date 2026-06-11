# Project Overview
**Name:** MajorGBN Enterprise Platform (Staff Classification, Career Partner & Forensic Recovery)
**Purpose:** A comprehensive enterprise Next.js application featuring AI-driven staff team placement, strategic career roadmapping, and a secure B2B portal for corporate forensic financial auditing and excess bank charges recovery.

## Tech Stack & Architecture
- **Framework:** Next.js 16 (App Router, Turbopack). The proxy/middleware convention is `proxy.ts` in repo root (not `middleware.ts`).
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (Enterprise-grade, high-trust UI)
- **Database:** PostgreSQL via Prisma. Schema in `prisma/schema.prisma`; migrations in `prisma/migrations/`.
- **AI Integration:** Vercel AI SDK (`@ai-sdk/anthropic`)
- **AI Model:** Anthropic Claude (configurable per-route; check the specific route file)
- **Email:** Resend (`lib/email.ts` — branded HTML templates)
- **Document Storage:** Pluggable backend (`STORAGE_BACKEND=local|s3`). S3-compatible (AWS S3, Cloudflare R2, MinIO) via `lib/uploads.ts`.
- **Auth:** Two parallel systems — admin (email+password+TOTP, HMAC cookie) and client (Google OAuth + magic-link, DB-backed sessions).
- **PDF Generation:** `jspdf` via `lib/pdf.ts` (forensic case reports)
- **Deployment:** Not yet wired (no Dockerfile / CI). Targeting Vercel-style hosting.

## Core Application Modules

### 1. Landing Page (`/`)
- A modern hero section explaining the three value propositions: AI Team Placement, Career Roadmapping, and Corporate Forensic Recovery.
- Clear navigation routing to `/assessment`, `/roadmap`, and `/recovery`.

### 2. Module 1: AI Staff Classification (`/assessment`)
- **Input Form:** Evaluates users across Psychological, Mental, Social, and Environmental attributes. Captures multiple "Certificates Acquired".
- **Backend API (`/api/classify/route.ts`):** Uses the Vercel AI SDK to evaluate the user.
- **Strict Output Requirement:** The AI must use a Zod schema to return an array of EXACTLY 3 objects representing the Top 3 best-fit departments.

**ALLOWED DEPARTMENTS (The AI must strictly choose from this list):**
- **[Banking & Financial Services]:** Corporate Banking, Retail Banking, Treasury, Risk Management, Compliance and AML, Internal Audit, Customer Service, Investment Banking, Corporate Communications, Trade Finance, Human Resources, Legal Services, Strategy and Analytics.
- **[Technology & Software Engineering]:** Software Development, DevOps & Cloud Infrastructure, Platform Engineering, QA & Automation, Data Science & AI, Product Management, UX/UI Design, Cybersecurity & InfoSec, IT Service Management.
- **[Fintech & Digital Payments]:** Payment Gateway Engineering, Blockchain & Web3, Core Banking Integration, E-Channel Security, Fraud Operations, Digital Wallet Management, Product Operations, Fintech Compliance.
- **[Manufacturing, FMCG & Production]:** Production Department, QA/QC, Supply Chain, Procurement, Maintenance/Engineering, Logistics, Product Development, Sales, Brand Management, HSE, Corporate Affairs, Warehouse Management.
- **[Food Restaurant Chain & Hospitality]:** F&B Management, Kitchen Operations, Front Office, Housekeeping, Restaurant Operations, Franchise Management.
- **[General Corporate Support Services]:** HR & Admin, Finance & Accounts, Legal & Secretariat, IT, Corporate Strategy, Marketing & Comms, Internal Control, Facility Management.

**Zod Schema Structure for Classification Output:**
- `rank`: (number, 1 to 3)
- `departmentName`: (string, exact match from allowed list)
- `industryCategory`: (string, exact match from allowed list)
- `reasoning`: (string, detailed explanation connecting traits/certifications to the role)

**Auth + shared internals (added):**
- The individual flow (`/assessment` page + `POST /api/classify`) is now **client-auth gated** — page via `app/assessment/layout.tsx`, API via `getClientUserFromRequest`. The fixed-enum schema/output above is unchanged.
- The canonical P/M/S/E fields live in `lib/classificationSchema.ts` (single source for the bulk template, the parser, and both prompt builders). The Anthropic call is shared in `lib/classify.ts` (`runClassification`) — the fixed-enum flow and the dynamic bulk flow both use it with their own Zod schema.

**Bulk Assessment & Classification (HR) — `/client/bulk-classify`:**
- HR downloads an `.xlsx` template (`/api/client/bulk-classify/template`), fills one row per staff member, picks target positions from the **hybrid catalog** (`/api/client/positions` — system + own custom), and uploads (`POST /api/client/bulk-classify`, rate-limited 3/hr). Malformed rows are rejected with reasons; the batch isn't failed.
- Persisted as a **durable job** (mirrors the webhook-delivery pattern): `ClassificationBatch` + one `StaffClassification(pending)` per row. Processing is kicked immediately via `after()` and drained by `/api/cron/classify/process` as a backstop. The bulk classifier uses a **dynamic allowed-list** (the HR-selected positions, incl. custom) — a parallel Zod schema whose `departmentName` is constrained to the selected set; output is a ranked array with `positionId`, `confidence`, and attribute-citing `reasoning`.
- Results at `/client/bulk-classify/[batchId]` (polls progress) with CSV/xlsx export; batches are surfaced on `/client/dashboard`.

### 3. Module 2: Strategic Career Partner (`/roadmap`)
- **Input Form:** Captures "Current State" and "Future State" (desired role in 1 to 15 years).
- **Backend API (`/api/roadmap/route.ts`):** Processes the input using Anthropic.
- **Zod Schema Structure for Roadmap Output:** Generates a structured array of timeline steps. Each step must contain:
   - `timeframe`: (string, e.g., "Year 1-2")
   - `milestoneName`: (string)
   - `strategicReasoning`: (string, explicitly justifying the step based on industry realities)
   - `recommendedCertifications`: (array of strings, listing necessary certifications required to achieve this specific milestone)
- **UI:** Rendered as a clean, vertical timeline component.

### 4. Module 3: Excess Charges Recovery Platform (`/recovery`)
- **Purpose:** A B2B portal for corporate organizations to request forensic audits to recover illegitimate bank deductions (interest, COT, LC charges) based on CBN and BOFIA regulations.
- **UI Requirements:** - Emphasize the "Zero-Risk / 30% Success Fee" model.
  - Display the "Six-Step Recovery Process" (Engagement, Document Collection, Forensic Analysis, Findings Report, Bank Engagement, Recovery).
- **Interactive Estimator:** A component that takes an "Annual Turnover Band" and outputs the "Typical Recovery Range" and "Estimated Timeline" (e.g., ₦200M – ₦1B yields ₦5M – ₦40M in 6-10 weeks).
- **Complaint Lodging Form:** A secure intake form capturing corporate details, banks used, and NDPA 2023/NDA compliance acknowledgments, with secure document uploads (Statements, Letters of Authority).

### 5. Module 4: GICN — Global Impact Christian Network (`/gicn`)
A youth/NGO arm: programme registration, check-in, certificates, and sponsorship. **Completely separate from `/recovery`** (different audience, different data model, different admin views) but reuses the platform's auth/uploads/email/audit/rate-limit/PDF/AES infrastructure.

**CRITICAL data-protection rules (NDPA 2023, minors) — do not weaken:**
- **Minors never hold accounts.** Every account holder is an adult — a parent/guardian or a school partner. Children exist only as dependent `Participant` records owned by an adult `User`. No auth, no login, no email for any minor.
- **No NIN at registration.** NIN is collected ONLY on a `ScholarshipAward` record, later, from the adult, and is stored **encrypted at rest** via `encryptSecret`/`decryptSecret` (`lib/totp.ts`, same AES-256-GCM as TOTP secrets). Plaintext NIN is never persisted and never returned by any list endpoint (`/api/admin/gicn/scholarships` returns `hasNin: boolean` only).
- **Consent is captured at the point a `Participant` is created** (guardian self-serve, or school-attested per bulk row requiring `guardianConsent=yes`): `consentGrantedAt` (timestamptz) + `consentGrantedByUserId` + optional `mediaReleaseGranted`. Audit-logged (`gicn_participant_create`).
- Retention/audit conventions apply to all GICN personal data like the rest of the platform.

**Registrant types** (`GicnProfile.kind`): `guardian` (registers own children) | `school` (bulk-registers students; `organizationName` required).

**Prisma models:** `GicnProfile` (1:1 with `User`), `Participant`, `Program` (string status `DRAFT|OPEN|CLOSED|COMPLETED`, string `type` from `PROGRAM_TYPES`), `ProgramRegistration` (`@@unique([participantId, programId])`, status `PENDING|CONFIRMED|WAITLISTED|CANCELLED`, unique `checkInCode`, `checkedInAt`), `Sponsorship` (string status `pending|paid|refunded|cancelled`), `ScholarshipAward` (encrypted `ninEncrypted`). Const-unions + helpers in `lib/gicn.ts`; bulk parse/validate in `lib/gicnRegistrationSchema.ts` (mirrors `lib/classificationSchema.ts`); **Paystack** payment gateway in `lib/payments.ts` (NGN/kobo; init + verify + HMAC-SHA512 signature) with DB-confirm orchestration in `lib/sponsorship.ts`.

**Public pages:** `/gicn` (landing), `/gicn/sponsor` (sponsor form → **Paystack** hosted checkout via `initiateSponsorshipPayment`; verified `charge.success` flips `Sponsorship` to `paid` idempotently via the webhook `POST /api/gicn/sponsor/webhook` **and** the `/gicn/sponsor/complete` callback, both using `confirmSponsorshipByReference`; falls back to a no-op "pending" stub when `PAYSTACK_SECRET_KEY` is unset). **Signed-in (account) pages** under route group `app/gicn/(account)/` (guarded by its `layout.tsx` via `getClientUserFromCookies`): `/gicn/register` (profile onboarding), `/gicn/dashboard`, `/gicn/participants` (CRUD + register), `/gicn/programs` (browse OPEN + register), `/gicn/school/bulk` (school-only xlsx/csv upload).

**Registration is capacity-aware:** confirmed-count ≥ `capacity` → auto-`WAITLISTED`, else `CONFIRMED`; both get a `checkInCode` (`GICN-XXXXXX`). Bulk upload is **synchronous** (no AI → no async job) with reject-row-with-reasons.

**Admin** (under `app/admin/(dashboard)/gicn/`, nav link gated by `can(role,"gicn.manage")`): `/admin/gicn` (programme CRUD + stats), `/admin/gicn/[id]` (registrations, check-in by code/QR or row, waitlist promote, certificate PDF via `renderGicnCertificate` in `lib/pdf.ts`), `/admin/gicn/sponsorships` (ledger). New RBAC permissions `gicn.manage` + `gicn.checkin` (both 2FA-required; held by `owner` via `*` and the dedicated **`gicn_manager`** role only — the enterprise `manager` role has **no** GICN access, keeping the recovery and GICN arms isolated). Admin check-in input is keyboard-driven + auto-focused so a hardware QR scanner works; parents get a scannable QR (`components/gicn/QrCode.tsx`) on registration success.

**Scholarship Review Board (`/admin/gicn/scholarships`):** full lifecycle on `ScholarshipAward` (status `applied|under_review|awarded|rejected|onboarding|active|suspended|completed|terminated|withdrawn`, lifecycle source-of-truth + transitions in `lib/scholarship.ts`, decision orchestration in `lib/scholarshipDecide.ts`). Board nominates/reviews/awards/activates/suspends/etc. via `/api/admin/gicn/scholarships[/[id]/decide]` (perm **`scholarship.review`**); per-scholar **monitored profile** = compliance conditions, per-term academic records, manual **disbursement ledger** (perm **`scholarship.disburse`**), document vault, and a review timeline. **NIN + full payout account are encrypted at rest** (`encryptSecret`) and **never** returned by any list/detail API (only `hasNin`/`payoutAccountLast4`); the `…/[id]/reveal` endpoint requires `scholarship.disburse` + **`verifyStepUp`** + audit. New RBAC perms `scholarship.review` + `scholarship.disburse` (2FA-required; held by `owner` + `gicn_manager`; enterprise `manager` excluded). Models: `ScholarshipReview`, `ScholarshipCondition`, `ScholarshipAcademicRecord`, `ScholarshipDisbursement`, `ScholarshipDocument` (all RLS-enabled, cascade with the award). **Pending (Phase 2/3):** guardian-facing apply/onboarding + read-only profile; renewal-reminder cron.

**Tier-2 scaffolds (not built):** impact report.

## Authentication

Two **separate** systems sharing one signing secret (`ADMIN_SESSION_SECRET`):

### Admin auth (staff)
- **Storage:** `AdminUser` table — scrypt-hashed password (`lib/auth.ts:hashPassword`), optional `googleSub` for Google sign-in, optional `totpSecret` (encrypted AES-256-GCM) + `recoveryCodeHashes[]`.
- **Cookie:** `gbn_admin`, stateless HMAC token: `userId.timestamp.signature`, 7-day TTL.
- **Login methods:**
  - Email + password + optional TOTP (or recovery code) at `/admin/login`
  - Google OAuth with optional domain lock via `ADMIN_GOOGLE_DOMAIN` — only allows accounts where the email matches an existing `AdminUser` row.
- **Bootstrap:** when zero `AdminUser` rows exist, the first login attempt with `ADMIN_PASSWORD` env value auto-creates the first user. Once any user exists, env-password is ignored.
- **Bulk revoke:** rotate `ADMIN_SESSION_SECRET` — invalidates all admin sessions.
- **Per-admin revoke:** `AdminUser.tokenInvalidBefore` cutoff — `getAdminFromRequest/Cookies` reject tokens issued before it. Set via `POST /api/admin/users/[id]/revoke` (owner-only) or the "Force sign-out" button in `/admin/users`. Kills one admin's sessions without affecting others (offboarding / suspected compromise).
- **Helper:** `getAdminFromRequest(req)` / `getAdminFromCookies()` in `lib/auth.ts` — return `{ id, email, role, totpEnabled }`.

### Admin RBAC (roles + enforcement)
Three roles, enforced **server-side, deny-by-default** via `requireAdmin(req, perm)` in `lib/rbac.ts`. UI hiding is UX only — the API is the source of truth. **Every new `/api/admin/*` mutation/sensitive route MUST call `requireAdmin` with the right `Permission`.**
- **Roles:** `owner` (full = `*`), `manager` (enterprise/recovery only — `cases.read/write`, `pii.download/export`, `referrals.read`, `ops.email_test`; **no GICN**), `viewer` (`cases.read` only), `gicn_manager` (**GICN only** — `gicn.manage` + `gicn.checkin`; no cases/PII/referrals/users/webhooks/audit). `normalizeRole()` maps any legacy/unknown value → `manager`. New admins **default to `manager`** (least privilege); bootstrap user is `owner`. Recovery and GICN are mutually isolated; only `owner` spans both.
- **Owner-only:** `users.manage`, `webhooks.manage`, `retention.purge`, `audit.purge`, `referrals.payout`. (UI: Users/Webhooks/Export nav + RetentionCard hidden from non-owners; `/admin/users` + `/admin/webhooks` server-redirect non-owners.)
- **Referrals tier:** `referrals.read` (owner + manager) gates the `/admin/referrals` view + nav (referrer emails + earnings) — viewers are excluded (page redirects). `referrals.payout` (owner-only, 2FA + audited) records payments.
- **Mandatory 2FA:** every non-read permission also requires `totpEnabled` — privileged actions can't be taken from a password-only account. Reads are exempt so a new admin can reach `/admin/account` to enrol.
- **Step-up re-auth:** retention purges + admin-delete additionally require `verifyStepUp(adminId, { code | password })` (current TOTP, or password if no 2FA) in the request body. UI prompts for the current 2FA code.

### Client auth (end users)
- **Storage:** `User` table — `googleSub` (optional), `email` (unique), `name`, `imageUrl`, `emailVerified`.
- **Cookie:** `gbn_user`, **opaque random token** (sha256 looked up in `Session` table), 30-day TTL.
- **Sessions are server-side** — every active device has a `Session` row (userAgent, IP, lastUsedAt, revokedAt). Users can list and revoke per-device from `/client/account`.
- **Login methods:**
  - Google OAuth at `/api/auth/google/start?mode=client`
  - Magic-link email at `/api/auth/email/start` → user clicks link → `/api/auth/email/verify` mints a session
- **Helper:** `getClientUserFromRequest(req)` / `getClientUserFromCookies()` — returns `{ id, email, name, imageUrl, sessionId }`.
- **Auto-link:** on first sign-in, any `RecoveryComplaint` rows whose `contactEmail` matches are linked via `userId`.

## Admin Panel (`/admin`)

All `/admin/*` page routes and `/api/admin/*` API routes are gated by `proxy.ts`. Unauthenticated requests redirect to `/admin/login?next=…` or return 401 JSON for APIs.

**Pages** (under `app/admin/(dashboard)/`):
- `/admin` — case list with search/filter, stat cards, email pipeline + storage + retention health
- `/admin/cases/[ref]` — case detail, status timeline, findings editor, PDF report, document download, internal notes, advance form
- `/admin/referrals` — referral partners with attribution counts
- `/admin/audit` — full audit log with filters
- `/admin/users` — admin user CRUD (cannot delete self or last admin)
- `/admin/webhooks` — webhook CRUD, test-fire, per-hook delivery history
- `/admin/account` — 2FA setup/disable, recovery codes, password change

**Key admin API patterns:**
- `/api/admin/cases/[ref]/advance` — POST advances status, fires webhooks, emails client (unless `notify: false`)
- `/api/admin/cases/[ref]/report.pdf` — generates PDF via `lib/pdf.ts`
- `/api/admin/retention/purge` — document retention purge
- `/api/admin/retention/audit/purge` — audit log retention purge
- `/api/admin/export/complaints` — CSV export

## Client Portal (`/client`)

- `/client/signin` — unified entry (Google OAuth + email magic-link)
- `/client/dashboard` — recovery cases, saved classifications, saved roadmaps. Has `MigrationBridge` that pushes localStorage entries to the server on first sign-in.
- `/client/account` — display name edit, email change (verifies new address before swap), connected accounts (disconnect Google), active sessions (per-device revoke + "sign out everywhere else"), danger-zone account deletion

**Account deletion semantics:** `User` row + `SavedClassification` + `SavedRoadmap` + `Session` rows cascade-delete, plus the user's custom `Position` rows + `ClassificationBatch`/`StaffClassification` rows. `RecoveryComplaint` rows are PRESERVED (legal retention) but `userId` is set to NULL.

## Forensic Recovery Workflow

Case lifecycle is driven by `CaseStatusEvent` rows. Step keys (in `lib/recoverySteps.ts:STEP_KEYS`):
```
received → reviewing → documents → auditing → findings → engagement → recovered
```

- **Intake** (`/recovery#intake`): creates `RecoveryComplaint`, assigns a forensics team via `pickTeam(referenceId)`, creates the initial `received` event, sends client confirmation email + internal notification.
- **Reference ID format:** `GBN-<base36 timestamp>-<random 4 chars>` (e.g., `GBN-MPB4JQHX-166A`). Admin tracking page and client track page both look up by this.
- **Advance** (`POST /api/admin/cases/[ref]/advance`): admin moves the case forward. Each transition:
  - writes a `CaseStatusEvent` (transactional with the `status` column update)
  - audit-logs the action with actor email
  - emails the client (unless suppressed)
  - fires `case.status_changed` webhook + `case.closed` when reaching `recovered`
  - on `recovered`, sets `closedAt` (starts the retention clock)
- **Findings & recovery amount:** entered by admin in `/admin/cases/[ref]` → stored in `findingsSummary` (TEXT) and `recoveryAmountKobo` (BigInt — kobo). PDF includes both.
- **Internal notes:** admin-only annotations (`CaseNote`), invisible to the client even in the NDPA data export.

## Operations

### Webhooks
- Configure at `/admin/webhooks`. HTTPS-only URLs.
- Events: `case.status_changed`, `case.closed`, `case.note_added`, `referral.created` (last two reserved — not yet fired).
- **Signing:** HMAC-SHA256 of body with per-webhook secret, sent as `X-GBN-Signature: sha256=…`.
- **Filters** (optional per webhook): `minRecoveryKobo` (BigInt as string), `statuses` (array), `hasReferral` (boolean). Below-threshold events never create a delivery row.
- **Retry & DLQ:** every delivery is a `WebhookDelivery` row. Backoff: 1m → 5m → 30m → 2h → 12h, then `status="dead"` at 5 attempts. Retry endpoint at `/api/cron/webhooks/retry`. Admin can manually retry a dead delivery from the deliveries panel.

### Audit log
- `AuditLog` table. Every admin action and sensitive client action records an entry (login success/fail, case advance, document download, CSV export, account deletion, etc.).
- Searchable at `/admin/audit` by action / actor / target ID.
- Retention: configurable via `AUDIT_LOG_RETENTION_DAYS` (default 730). Purge via dashboard or `POST /api/admin/retention/audit/purge`.

### Document retention
- `RETENTION_DAYS` (default 1095 / 3 years) past `closedAt`.
- Purge deletes both the blob (via storage abstraction) and the `UploadedDocument` row. The `RecoveryComplaint` row itself is preserved.

### Storage backends (`lib/uploads.ts`)
- `STORAGE_BACKEND=local` — default. Writes to `./uploads/`.
- `STORAGE_BACKEND=s3` — AWS S3 / R2 / MinIO. Required env: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Optional: `S3_ENDPOINT` for R2/MinIO.
- Per-row `UploadedDocument.storageBackend` column so old local files keep working after the env flip.
- One-off backfill: `npm run migrate:uploads-to-s3` (script in `scripts/migrate-uploads-to-s3.mjs`, supports `--dry-run`).

### Email (`lib/email.ts`)
- All outbound mail via Resend. Helpers: `sendLeadMagnetGuide`, `sendComplaintConfirmation`, `sendInternalComplaintNotification`, `sendStatusUpdate`, `sendMagicLink`, `sendEmailChangeConfirmation`, `sendPlain` (for admin test).
- Config validator: `getEmailConfigStatus()` checks `RESEND_API_KEY`, `RESEND_FROM_EMAIL` format, `INTERNAL_NOTIFY_EMAIL`. Surfaced on admin dashboard.
- Test endpoint: `POST /api/admin/email-test` sends a probe email to the calling admin.

### Rate limiting (`lib/rateLimit.ts`)
- In-memory sliding window (resets on deploy). Applied to: `/api/recovery` (5/hr), `/api/lead-magnet` (10/hr), `/api/refer` (10/hr), `/api/admin/login` (5/15min), `/api/auth/email/start` (5/hr per IP, 3/hr per email), `/api/client/me/email-change/start` (3/hr per user), `/api/recovery/[ref]/data` (5/hr).

### Security headers
- Set globally in `proxy.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Plus HSTS in production.

## Data Model — key Prisma models

Stored in `prisma/schema.prisma`. Recently-added timestamp columns use `@db.Timestamptz(3)` (TIMESTAMPTZ) to avoid timezone bugs in cron-style comparisons — be aware that legacy columns (RecoveryComplaint, AuditLog) are still `TIMESTAMP(3)` and rely on Prisma writing/reading consistently as UTC.

- **Recovery:** `RecoveryComplaint`, `CaseStatusEvent`, `CaseNote`, `UploadedDocument`, `Referral`
- **Auth (admin):** `AdminUser`, `AuditLog`
- **Auth (client):** `User`, `Session`, `MagicLinkToken`, `EmailChangeToken`
- **AI artifacts (signed-in users):** `SavedClassification`, `SavedRoadmap`
- **Staff classification (HR):** `Position` (hybrid catalog — system rows have `userId=null`, custom rows are per-user), `ClassificationBatch`, `StaffClassification`. All cuid ids; `selectedPositionIds` is `String[]`. Custom positions + batches cascade-delete with the owning `User`.
- **Marketing:** `LeadMagnetSubscriber`
- **Operations:** `Webhook`, `WebhookDelivery`
- **GICN (youth/NGO):** `GicnProfile`, `Participant`, `Program`, `ProgramRegistration`, `Sponsorship`, `ScholarshipAward` (encrypted NIN). Adults own participant records; minors never authenticate. See Module 4.

## Cron endpoints

Both require `CRON_SECRET`. Pass it as `Authorization: Bearer <secret>` OR `X-Cron-Secret: <secret>`. Accept both `GET` and `POST` so any scheduler (Vercel Cron, GitHub Actions, external) can fire them.

| Path | Recommended schedule | What it does |
|---|---|---|
| `/api/cron/webhooks/retry` | every 5 minutes | Re-attempts due `WebhookDelivery` rows, escalates backoff, dead-letters at 5 attempts |
| `/api/cron/cleanup` | daily | Deletes magic-link / email-change / revoked-or-expired session rows older than 1 day past expiry |
| `/api/cron/classify/process` | daily (backstop) | Drains pending `StaffClassification` rows for bulk HR classification jobs. The upload route also kicks immediate processing via `after()`, so cron is only a backstop; an external scheduler can hit it more often for prompt draining of large batches. |
| `/api/cron/gicn/reconcile-payments` | every ~30 min (GitHub Actions: `.github/workflows/gicn-reconcile.yml`) | Reconciles stale `pending` GICN sponsorships against Paystack — confirms successes whose webhook+callback both missed (idempotent paid flip + email), marks failed/abandoned/reversed (and >24h-stuck) transactions as `failed`. No-op when Paystack is unconfigured. |
| `/api/cron/gicn/reminders` | daily (GitHub Actions: `.github/workflows/gicn-reminders.yml`) | Emails guardians/schools a check-in reminder for every APPROVED registration on an OPEN/CLOSED programme starting within 3 days. Idempotent via the AuditLog (`gicn_reminder_sent`), so re-runs never double-email. Logic in `lib/gicnReminders.ts`. |

## Environment variables

See `.env.example` for the full annotated set. Critical groups:
- `ANTHROPIC_API_KEY` (AI)
- `DATABASE_URL` (Postgres)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `INTERNAL_NOTIFY_EMAIL` (email)
- `NEXT_PUBLIC_APP_URL` (used in emails, OAuth redirects, sitemap, robots)
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (admin auth — secret must be ≥32 chars hex)
- `STORAGE_BACKEND`, `S3_*` (uploads)
- `RETENTION_DAYS`, `AUDIT_LOG_RETENTION_DAYS` (retention policies)
- `CRON_SECRET` (cron auth)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `ADMIN_GOOGLE_DOMAIN` (OAuth)

## Common operations

### Bootstrap the first admin
1. Set `ADMIN_PASSWORD` to a long random string in `.env.local`.
2. Visit `/admin/login`, sign in with any email + that password — the first `AdminUser` row is created automatically with `role="owner"`.
3. From `/admin/users`, invite teammates (they need to be created here before they can use Google sign-in too).

### Run a Prisma migration
```bash
set -a && source .env.local && set +a
npx prisma migrate dev --name <description>
```
If the prompt blocks (warnings about unique constraints on nullable columns etc.), `npx prisma db push --accept-data-loss` is the dev escape hatch; record the migration manually under `prisma/migrations/` and run `npx prisma migrate resolve --applied <name>`.

### Local dev gotchas (this environment)
- **Env sourcing:** `set -a && source .env.local && set +a` works; `source .env.production.local` **breaks** — `RESEND_FROM_EMAIL=MajorGBN <noreply@…>` is unquoted so the shell reads `<` as redirection. To use prod values, extract single keys: `grep -E '^DATABASE_URL=' .env.production.local | cut -d= -f2- | sed 's/^"//;s/"$//'`.
- **DB connectivity:** `DATABASE_URL` is the Supabase **transaction pooler (:6543)** — flaky/unreachable from local. For local scripts (seeds, one-off PrismaClient) use **`DIRECT_URL` (:5432)** + a small retry loop; same DB. Migrations already use `directUrl`.
- **Builds need env:** `npm run build` runs `prebuild` (`check-env.mjs`) which exits 1 if required vars are unset — always source env first. `check-env` applies production-only gates by `VERCEL_ENV` (preview passes leniently; local build uses `NODE_ENV`).
- **No local shadow DB:** hand-write `prisma/migrations/<ts>_name/migration.sql` matching Prisma's format, then `npm run db:migrate` (`prisma migrate deploy`, prod env) applies it. Node 24 runs `.ts` scripts directly (`npm run seed:positions`).
- **Smoke-testing auth-gated flows:** mint a client session row directly (sha256 of a random base64url token → `Session.tokenHash`, see `lib/sessions.ts`), send it as the `gbn_user` cookie in curl; clean up by deleting the test `User` (cascades). Use `+tag` Gmail aliases.

### Switch to S3 storage
1. Set `STORAGE_BACKEND=s3` plus `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (and optionally `S3_ENDPOINT` for R2/MinIO).
2. New uploads will go to S3. Existing rows with `storageBackend="local"` still work via the local disk.
3. To migrate existing files: `npm run migrate:uploads-to-s3` (supports `--dry-run` first).

### Enable Google sign-in
1. Create a Web Application OAuth Client at https://console.cloud.google.com/apis/credentials
2. Authorised redirect URI = `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. (Optional, admin) set `ADMIN_GOOGLE_DOMAIN=yourdomain.com` to lock admin Google sign-in to one Workspace domain.

### Schedule the cron endpoints (Vercel)
Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/webhooks/retry", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/cleanup",        "schedule": "0 4 * * *" }
  ]
}
```
Vercel Cron uses `Authorization: Bearer ${CRON_SECRET}` automatically — make sure `CRON_SECRET` is set in the Vercel env.

## Pre-launch verification status

Last full pass: **2026-05-19** against `localhost:3100` with real Resend + local Postgres. Most flows have been driven end-to-end via API; visual UI + interactive third-party flows have not.

### ✓ API-verified (works exactly as written)

| Area | What was exercised | Notes |
|---|---|---|
| Recovery intake (`A4`) | POST `/api/recovery`, required-field validation, ack-checkbox enforcement, ref-ID generation, team assignment, real email send | Confirmation + internal-notification emails accepted by Resend |
| Public tracking (`A5`) | `/api/recovery/track`, NDPA data export (correct + wrong email rejection, generic 404 to prevent enumeration), rate limit 5/hr | Note: `+` in `?email=` query params must be URL-encoded (`%2B`); browser form does this correctly |
| Referrals (`A6`) | POST `/api/refer`, public stats endpoint, attribution counts | |
| Magic-link sign-in (`B1`) | Token issue, verify, session creation, token reuse rejection, auto-link to matching complaints by email | Two passes: fresh identity (no auto-link) + email-matching identity (auto-links all matching complaints) |
| Email change (`B7`) | Start, new-address verification, same-email rejection, conflict-with-existing-user rejection, atomic email swap | `EmailChangeToken` flow including `usedAt` marking |
| Sessions (`B8`) | List active sessions with UA/IP, revoke-all-others (keeps current), revoked sessions immediately 401 | DB-backed per-device sessions, not HMAC |
| Account deletion (`B9`) | `confirmEmail` mismatch rejection, cascade cleanup of Session + SavedClassification + SavedRoadmap, `RecoveryComplaint.userId` detachment with row preserved (legal retention) | |
| Admin auth (`C1`-`C4`) | Password login, 2FA enable with recovery codes, recovery-code login + reuse rejection, password change validation, multi-admin create/delete, can't-delete-self | |
| Case lifecycle (`C5`) | Notes, findings + recovery amount (BigInt kobo), advance through all 7 steps, status email on advance, `closedAt` set at `recovered`, PDF report (12KB, 2 pages, valid PDF 1.3) | Canonical fixture: `GBN-MPCAJVI7-C8ZD` — Walkthrough Test Industries Ltd, ₦12.5M recovery, status=recovered. Survives DB resets, useful for regression tests. |
| Document download (`C6`) | Upload via `/api/upload`, admin download via `/api/admin/cases/[ref]/documents/[id]`, byte-for-byte match, audit-logged | Local backend fully tested. **S3 WRITE path verified live on prod Backblaze B2 2026-06-02** — POST to `https://majormaestro.com/api/upload` returned `storageBackend:"s3"` + 200 (creds/bucket/endpoint + `forcePathStyle` all good). Read (`getObject`) + retention delete (`deleteObject`) share the same client but were NOT live-tested — B2 application keys are per-capability, so confirm the key has `readFiles`+`deleteFiles` via a full UI round-trip (intake upload → admin download → purge) before relying on retention. |
| Operational endpoints (`C7`-`C12`) | CSV export with filters, audit log search by action/actor, retention previews, email-test from dashboard | |
| Webhooks (`C9`-`C10`) | Test-fire, real fire on case advance, HMAC signing, exponential backoff (1m → 5m → 30m → 2h → 12h), dead-letter at 5 attempts, manual retry of dead delivery | |
| Security (`D1`-`D6`) | Auth gates on `/admin/*` + `/api/admin/*` + `/client/dashboard` + `/api/client/*`, headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), rate limits on magic-link start (5/hr per IP) + NDPA export (5/hr per IP), cron auth, revoked session can't replay even with stolen cookie | HSTS + `X-Robots-Tag: noindex` are set via `vercel.json` + production-only branch in `proxy.ts` — both verified live on `majormaestro.com` 2026-06-02 |
| Backup + restore (`E3`) | `npm run backup:db` produces 12KB gzipped dump; restored into a scratch DB yields exact table-count match across all 8 tracked tables, all 10 FKs + 50 indexes intact, canonical fixture restorable with full relations | This is the disaster-recovery test most teams discover too late. Ours works. |

### ⏳ Gated on human + dashboards (NOT yet verified)

These require a real browser, real third-party accounts, or both. Not testable from this codebase alone:

- `A1` — landing page rendering on real mobile devices
- `A3` — assessment / pre-screener / quiz AI flows (would burn Anthropic credits; defer until you're already clicking through)
- `B2` / `B3` — Google OAuth interactive flow (consent screen, account picker, callback). **Config verified live 2026-06-02:** prod `/api/auth/google/start` redirects to Google's real sign-in page with `client_id=370965356713-…` and `redirect_uri=https://majormaestro.com/api/auth/google/callback` accepted (no `redirect_uri_mismatch`/`invalid_client`). PKCE S256 + `prompt=select_account` confirmed. **Still needs a human** to type credentials + click Allow, and the operator must confirm the OAuth **consent screen is Published ("In production"), not "Testing"** — a Testing-mode app blocks non-test users *after* account pick (undetectable without a real sign-in).
- `B4`-`B6` — cross-session assessment save → sign-in → localStorage migration banner (needs cross-tab browser test)
- `E1` — Sentry receiving events (no-op until `SENTRY_DSN` is set in env)
- `E2` — Resend dashboard log inspection (only the operator can log in)
- `F` — mobile + a11y audit (real devices, real screen readers)
- `G` — final go/no-go signoff (you, not me)

### Known flags worth re-checking before launch

1. ~~**`POST /api/admin/email-test` returned `resendId: null`**~~ **RESOLVED 2026-06-02** — root cause was a swallowed error, not Resend. The Resend SDK *resolves* (doesn't throw) on a rejected send, returning `{ data: null, error }`; `sendPlain` ignored `result.error`, so a failed send reported `success: true, resendId: null`. Fixed in `lib/email.ts:sendPlain` — it now throws `error.name: error.message`, which the route's catch turns into a 502. Verified separately that the domain is fully set up and Resend returns IDs normally (direct API probe returned a message id; domain `majormaestro.com` status=`verified`, SPF/DKIM/MX/DMARC all present in DNS, sending enabled in `eu-west-1`).
2. **`@example.com` test bounces in Resend history** — left over from earlier automated smoke tests. **Dashboard-only task (operator):** Resend → Suppressions, add the bounced `@example.com` addresses. Not fixable from code. See `LAUNCH-CHECKLIST.md → Test email convention` for the proper alias pattern going forward. (DMARC is currently `p=none` — fine for launch; consider tightening to `quarantine` once delivery is confirmed stable.)
3. ~~**`X-Robots-Tag: noindex` on `/admin/*`** is configured in `vercel.json` only — re-verify on the live deploy that the header is present.~~ **RESOLVED 2026-06-02** — verified live on `https://majormaestro.com/admin/login` (and the `/admin` → `/admin/login` redirect target): `x-robots-tag: noindex, nofollow` present.
4. ~~**`Strict-Transport-Security`** is set in `proxy.ts` only when `NODE_ENV === "production"` — won't appear in `npm run dev`.~~ **RESOLVED 2026-06-02** — verified live on `https://majormaestro.com/`: `strict-transport-security: max-age=63072000; includeSubDomains; preload`.

### Canonical test fixture

`RecoveryComplaint GBN-MPCAJVI7-C8ZD` is the reference case that's been driven through every admin and client flow. It's preserved across DB resets (only `nwosumajor+%@gmail.com` and `@example.com` test data are cleaned). Use it for:
- Manual UI walkthroughs (`/admin/cases/GBN-MPCAJVI7-C8ZD`)
- Backup/restore drills (verify it survives the round-trip)
- PDF report regression checks (12KB, 2 pages, contains "CLOSED / RECOVERED" + findings text)

## Development Guidelines
1. **AI Keys:** Use `process.env.ANTHROPIC_API_KEY` in API routes.
2. **Security & Trust:** The `/recovery` module must look highly secure and professional, reflecting a financial institution's standards.
3. **Modularity & Fallbacks:** Keep UI components modular. Handle loading states gracefully. Implement try/catch blocks in API routes and render fallback UI if the AI response fails.
4. **Timestamps:** Prefer `@db.Timestamptz(3)` on any new `DateTime` column that will be compared against `NOW()` via raw SQL or against `new Date()` from JS. Legacy `TIMESTAMP(3)` columns are safe internally (Prisma always uses UTC) but will produce off-by-timezone bugs when admins poke them via psql.
5. **Audit:** Any new admin action that mutates state should call `recordAudit({ action, actorLabel, ... })` from `lib/audit.ts`. Use the calling admin's email as `actorLabel` via `getAdminFromRequest(req)?.email`.
6. **Sessions vs HMAC:** When adding new client-facing endpoints, use `getClientUserFromRequest(req)` — never roll your own cookie parsing. The `sessionId` it returns lets you scope revoke logic correctly.
7. **Rate limits:** Apply `rateLimit()` to any new public POST endpoint that triggers email, AI calls, or DB writes.
8. **Test email addresses:** Never use `@example.com`, `@test.com`, or any reserved/unroutable domain in smoke tests, seed data, or fixtures. Those addresses bounce through Resend, polluting the delivery log and slowly damaging sender reputation. Use Gmail `+tag` aliases on a domain the operator owns — e.g., `nwosumajor+magiclink@gmail.com`, `nwosumajor+intake@gmail.com`, `nwosumajor+lead@gmail.com`. They all land in one inbox for visual verification, but Resend tracks each as a distinct row searchable by `+tag`. For server-driven internal mail, real aliases like `forensics@majormaestro.com` and `referrals@majormaestro.com` are even better — they exercise actual production routing.
9. **Fire-and-forget on Vercel:** wrap post-response work (emails, bulk job processing) in `after()` from `next/server` — a bare unawaited Promise is torn down on response flush and silently dropped. See the recovery intake/advance routes and the bulk-classify upload route.
10. **Client auth gating lives in pages/routes, NOT `proxy.ts`:** `proxy.ts` only gates the admin scope (stateless HMAC, edge-verifiable). Gate client routes per-page via `getClientUserFromCookies()` + `redirect()` (or a server `layout.tsx`, e.g. `app/assessment/layout.tsx`) and per-API via `getClientUserFromRequest()` — DB-backed sessions can't be verified at the edge.
11. **Design system:** public UI uses `components/ui/{Button,Badge,Section}` + tokens in `app/globals.css` (`bg-ink`, `text-accent`, `font-display`=Fraunces, `font-figure` for ₦/numbers) and `lib/cn.ts`. Don't hand-roll button/section className strings. (Admin + client-dashboard still use legacy indigo.) Funnel events go through `lib/analytics.ts` `track()` (`@vercel/analytics`, enabled on the project).
12. **Crons are effectively daily on this Vercel plan** (the */5 webhook cron was removed) — make cron endpoints scheduler-agnostic (GET+POST, `CRON_SECRET` via `Bearer`/`X-Cron-Secret`), kick work immediately with `after()`, and treat cron as a backstop; an external scheduler can hit them more often.
13. **Email:** all senders route through `sendOrThrow` in `lib/email.ts` — Resend *resolves* (does not throw) on a rejected send, so the wrapper throws on `result.error` and callers log/handle it. New senders must use it.
14. **Admin RBAC:** every new `/api/admin/*` mutation/sensitive handler MUST gate with `requireAdmin(req, perm)` from `lib/rbac.ts` (deny-by-default) and use the returned `gate.admin` for `recordAudit` actorLabel. Pick the narrowest `Permission`; owner-only ops use `users.manage`/`webhooks.manage`/`retention.purge`/`audit.purge`. Destructive ops add a `verifyStepUp` check. Mirror the role in the UI (hide controls the role can't use), but never rely on UI hiding for security.
