# Data Map — where all user data lives

> Internal record of processing for **Major GBN Innovation Enterprise**
> (MajorGBN platform). Supports NDPA 2023 accountability. Keep this in sync when
> data flows, processors, or storage locations change.
>
> Last reviewed: 2026-06-07

## A. Sub-processors (third parties that touch user data)

All confirmed configured in the production (Vercel) environment.

| Processor | Role | Data it sees | Location |
|---|---|---|---|
| **Supabase** | PostgreSQL — primary datastore | Everything in the DB (every table in §B) | EU — Frankfurt, Germany (`eu-central-1`) |
| **Vercel** | Hosting, serverless functions, edge, Web Analytics | All request processing; IP addresses (transient); cookieless analytics | US company; served via London (`lhr1`) + US-East (`iad1`) |
| **Backblaze B2 / S3-compatible** | Uploaded documents | Bank statements, Letters of Authority (sensitive financial PII) | per `S3_REGION` — **confirm** (see §G) |
| **Resend** | Transactional email delivery | Recipient email + message content (names, reference IDs, GICN info) | EU — Ireland (`eu-west-1`) |
| **Anthropic (Claude)** | AI features (classify, roadmap, pre-screen, chat) | Text users submit to those tools (career history, staff attributes, banking-situation descriptions) | US |
| **Google** | OAuth sign-in (admin + client) | Google account email, profile, `sub` id | US / global |
| **Sentry** | Error monitoring (DSN set in prod) | Error events, stack traces, request context (may include IP / user id) | US |

> GitHub (source code) and the Claude PR-review GitHub Action process repository
> code/diffs, not production user data.

## B. Personal data held, by data subject → table

| Data subject | Personal data | Tables |
|---|---|---|
| Recovery clients (B2B) | company name, RC number, turnover band, banks, contact name/title/email/phone, findings, recovery amounts | `RecoveryComplaint`, `CaseNote`, `CaseStatusEvent` |
| Recovery clients (documents) | bank statements, letters of authority (sensitive financial) | `UploadedDocument` (blob in B2/S3) |
| End-user accounts | email, name, avatar URL, Google `sub`; device sessions (IP + user-agent); login tokens | `User`, `Session`, `MagicLinkToken`, `EmailChangeToken` |
| Admin / staff | email, scrypt password hash, AES-256-GCM TOTP secret, recovery-code hashes, Google `sub` | `AdminUser` |
| Referral partners | name, email, bank details, payout history | `Referral` |
| Marketing leads | email, company name | `LeadMagnetSubscriber` |
| AI tool users | saved career/roadmap data; bulk staff records (names, refs, attributes); custom positions | `SavedClassification`, `SavedRoadmap`, `ClassificationBatch`, `StaffClassification`, `Position` |
| GICN — **minors** | child full name, date of birth, school, class level, address, guardian name, consent records | `Participant` |
| GICN — adults | profile, phone, organisation; programme registrations; sponsors | `GicnProfile`, `ProgramRegistration`, `Sponsorship` |
| GICN — scholarship | **NIN (AES-256-GCM encrypted at rest)**, award amount | `ScholarshipAward` |
| Operational | admin emails + actions; funnel events; webhook config/signatures | `AuditLog`, `AnalyticsEvent`, `Webhook`, `WebhookDelivery` |

## C. Cookies & device storage

| Name | Purpose | Type |
|---|---|---|
| `gbn_admin` | Admin session (HMAC-signed) | Strictly necessary |
| `gbn_user` | Client session (opaque token; SHA-256 looked up server-side) | Strictly necessary |
| `gbn_oauth` | OAuth state/PKCE during sign-in | Strictly necessary (transient) |
| `gbn_ref` | Referral attribution (first-touch) | Functional / marketing |
| `gbn_turnover` | Estimator → intake prefill | Functional (sessionStorage, browser only) |
| `gbn_intake_draft` | Recovery form draft | Functional (localStorage, browser only) |
| Vercel Web Analytics | Aggregate traffic metrics | Cookieless |

## D. Security measures

HTTPS/HSTS; security headers; RBAC (deny-by-default, 2FA-gated mutations);
rate limiting; full audit logging. Passwords scrypt-hashed; session tokens
stored as SHA-256 hashes; TOTP secrets and NIN encrypted with AES-256-GCM at
rest; HMAC-signed admin cookies; signed webhooks. NDPA acknowledgement captured
at recovery intake; explicit guardian consent captured before any minor's
`Participant` record is created.

## E. Retention

| Data | Retention |
|---|---|
| Uploaded documents | ~3 years past case close (`RETENTION_DAYS`, default 1095) |
| Audit log | ~2 years (`AUDIT_LOG_RETENTION_DAYS`, default 730) |
| Sessions / login tokens | purged ~1 day past expiry (cron) |
| `RecoveryComplaint` | preserved for legal retention even after account deletion (`userId` nulled) |

## F. Data-subject controls in the product

- **Account deletion** (self-serve): `/client/account` — cascades `User` +
  `SavedClassification` + `SavedRoadmap` + `Session` + custom `Position` +
  classification batches; detaches `RecoveryComplaint` (`userId` → null).
- **NDPA data export / case lookup**: `/recovery/track` (email-verified).
- **Session management**: per-device revoke + sign-out-everywhere at `/client/account`.

## G. Open items to confirm

1. **`STORAGE_BACKEND` value in Vercel.** S3/B2 credentials are all set, but the
   local `.env.production.local` shows `local`. Confirm prod is `s3` so uploaded
   documents persist in B2 (not ephemeral function disk).
2. **Backblaze B2 region** (`S3_REGION`) for the international-transfer disclosure.
3. **NDPC registration / DPO appointment** — confirm whether required at your data
   volume under NDPA 2023, and record the DPO contact here once appointed.
