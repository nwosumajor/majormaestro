# Endpoint Reference — MajorMaestro Enterprise Platform

Complete map of every route in the application: **API routes** (`app/api/**/route.ts`)
and **page routes** (`app/**/page.tsx`). Generated 2026-06-11.

> Keep this in sync when adding/removing routes. Auth is enforced as noted —
> `/api/admin/*` in `proxy.ts` + a per-route RBAC `Permission` (`lib/rbac.ts`);
> client routes per-page via `getClientUser*`; crons via `CRON_SECRET`.

## Auth legend

| Symbol | Meaning |
|---|---|
| 🌐 | Public — no auth |
| 👤 | Client session (`gbn_user` cookie, DB-backed `Session`) |
| 🔐 | Admin (`gbn_admin` HMAC cookie) + RBAC `Permission` — gated in `proxy.ts` |
| ⏰ | Cron — `CRON_SECRET` via `Authorization: Bearer` or `X-Cron-Secret` (GET+POST) |
| 🔗 | Signed integration (HMAC signature, not a user session) |

---

## 1. Public pages 🌐

| Route | Purpose |
|---|---|
| `/` | Landing — AI Team Placement, Career Roadmapping, Forensic Recovery |
| `/assessment` | AI staff classification form (👤 gated via `app/assessment/layout.tsx`) |
| `/roadmap` | Strategic career roadmap |
| `/recovery` | Forensic recovery B2B portal + `#intake` complaint form |
| `/recovery/banking` · `/fmcg` · `/manufacturing` · `/trade-finance` | Industry landing pages |
| `/recovery/track` | Public case tracking by reference ID |
| `/recovery/refer` · `/recovery/refer/[code]` | Referral partner pages |
| `/classify` · `/bulk` · `/history` | Assessment helper pages |
| `/privacy` | Privacy / NDPA policy |

## 2. Public / shared API

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/health` | GET | 🌐 | Health check |
| `/api/recovery` | POST | 🌐 | Case intake — rate-limited 5/hr |
| `/api/recovery/track` | GET | 🌐 | Case status lookup |
| `/api/recovery/[ref]/data` | GET | 🌐 | NDPA data export — 5/hr |
| `/api/recovery/lc-interest-guide` | POST | 🌐 | Lead-magnet guide |
| `/api/refer` | POST | 🌐 | Create referral — 10/hr |
| `/api/refer/verify` | GET | 🌐 | Verify referral email |
| `/api/refer/[code]/stats` | GET | 🌐 | Public referral stats |
| `/api/lead-magnet` | POST | 🌐 | Lead capture — 10/hr |
| `/api/classify` | POST | 👤 | AI classification (Module 1) |
| `/api/roadmap` | POST | 👤 | AI roadmap (Module 2) |
| `/api/bulk-classify` | POST | 👤 | Bulk classify helper |
| `/api/parse-cv` | POST | — | CV parsing for assessment |
| `/api/pre-screen` | POST | — | Pre-screener |
| `/api/chat` | POST | — | AI chat |
| `/api/upload` | POST | 🌐 | Document upload (recovery intake) |
| `/api/track` | POST | 🌐 | Funnel analytics |

## 3. Client auth (end users) 👤

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/auth/email/start` | POST | Magic-link request — 5/hr IP, 3/hr email |
| `/api/auth/email/verify` | GET | Mint session from magic link |
| `/api/auth/google/start` | — | OAuth start (`?mode=client`) |
| `/api/auth/google/callback` | GET | OAuth callback |
| `/api/auth/logout` | POST | End session |
| `/api/client/me` | GET, PATCH, DELETE | Profile read/update + account deletion |
| `/api/client/me/email-change/start` | POST | Begin email change — 3/hr/user |
| `/api/client/me/email-change/verify` | GET | Confirm new address + atomic swap |
| `/api/client/me/disconnect-google` | POST | Unlink Google |
| `/api/client/sessions` | GET | List active devices |
| `/api/client/sessions/[id]/revoke` | POST | Revoke one device |
| `/api/client/sessions/revoke-all` | POST | Sign out everywhere else |
| `/api/client/complaints` | GET | User's linked recovery cases |
| `/api/client/positions` | GET, POST | Hybrid position catalog (system + custom) |
| `/api/client/bulk-classify` | POST | HR bulk upload — 3/hr |
| `/api/client/bulk-classify/template` | GET | XLSX template |
| `/api/client/bulk-classify/[batchId]` | GET | Batch progress |
| `/api/client/bulk-classify/[batchId]/export` | GET | CSV/XLSX results |
| `/api/account/classifications` | GET, POST, DELETE | Saved classifications |
| `/api/account/roadmaps` | GET, POST, PATCH, DELETE | Saved roadmaps |

**Client pages:** `/client/signin` · `/client/dashboard` · `/client/account` · `/client/bulk-classify` · `/client/bulk-classify/[batchId]`

## 4. GICN — Global Impact Christian Network

**Public pages 🌐:** `/gicn` · `/gicn/sponsor` · `/gicn/sponsor/complete`
**Account pages 👤** (`app/gicn/(account)/`): `/gicn/register` · `/gicn/dashboard` · `/gicn/participants` · `/gicn/programs` · `/gicn/school/bulk` · `/gicn/scholarships` · `/gicn/scholarships/apply` · `/gicn/scholarships/[id]`

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/gicn/sponsor` | POST | 🌐 | Initiate Paystack hosted checkout |
| `/api/gicn/sponsor/webhook` | POST | 🔗 | Paystack `charge.success` (HMAC-SHA512) |
| `/api/gicn/profile` | GET, POST | 👤 | Onboarding profile (guardian/school) |
| `/api/gicn/participants` | GET, POST | 👤 | Dependent records (consent captured) |
| `/api/gicn/participants/[id]` | PATCH, DELETE | 👤 | |
| `/api/gicn/programs` | GET | 👤 | Browse OPEN programmes |
| `/api/gicn/register` | POST | 👤 | Capacity-aware registration |
| `/api/gicn/school/bulk` | POST | 👤 | School bulk upload (synchronous) |
| `/api/gicn/school/bulk/template` | GET | 👤 | |
| `/api/gicn/scholarships` | GET, POST | 👤 | List + apply (ownership-enforced) |
| `/api/gicn/scholarships/[id]` | GET | 👤 | Monitored profile (read-only) |
| `/api/gicn/scholarships/[id]/onboard` | POST | 👤 | Bank + NIN (encrypted) + accept conditions |
| `/api/gicn/scholarships/[id]/documents` | POST | 👤 | Authenticated doc upload |
| `/api/gicn/scholarships/[id]/documents/[docId]` | GET | 👤 | Download |

## 5. Admin 🔐

Every `/api/admin/*` route gates with `requireAdmin(req, perm)`. RBAC roles &
permissions in `lib/rbac.ts` (owner / recovery_senior/lead/manager / gicn_senior/lead/manager / viewer).

**Pages** (`app/admin/(dashboard)/`): `/admin` · `/admin/login` · `/admin/account` · `/admin/audit` · `/admin/analytics` · `/admin/users` · `/admin/webhooks` · `/admin/referrals` · `/admin/cases/[ref]` · `/admin/gicn` · `/admin/gicn/[id]` · `/admin/gicn/impact` · `/admin/gicn/scholarships` · `/admin/gicn/scholarships/[id]` · `/admin/gicn/sponsorships`

### Auth & account
| Endpoint | Methods | Permission |
|---|---|---|
| `/api/admin/login` | POST | (public login) |
| `/api/admin/logout` | POST | session |
| `/api/admin/account/password` | POST | self |
| `/api/admin/account/2fa/setup` | POST | self |
| `/api/admin/account/2fa/enable` | POST | self |
| `/api/admin/account/2fa/disable` | POST | self |
| `/api/admin/account/2fa/recovery-codes` | GET, POST | self |

### Recovery cases
| Endpoint | Methods | Permission |
|---|---|---|
| `/api/admin/cases` | GET | `cases.read` |
| `/api/admin/cases/[ref]` | GET | `cases.read` |
| `/api/admin/cases/[ref]/advance` | POST | `cases.write` |
| `/api/admin/cases/[ref]/findings` | POST | `cases.write` |
| `/api/admin/cases/[ref]/notes` | POST | `cases.write` |
| `/api/admin/cases/[ref]/documents/[id]` | GET | `pii.download` |
| `/api/admin/cases/[ref]/report.pdf` | GET | `cases.read` |
| `/api/admin/export/complaints` | GET | `pii.export` |
| `/api/admin/referrals` | GET | `referrals.read` |
| `/api/admin/referrals/[id]/payout` | POST | `referrals.payout` (owner, 2FA + audited) |

### Operations
| Endpoint | Methods | Permission |
|---|---|---|
| `/api/admin/audit` | GET | `cases.read` / audit view |
| `/api/admin/email-test` | GET, POST | `ops.email_test` |
| `/api/admin/users` | GET, POST | `users.manage` (owner-only) |
| `/api/admin/users/[id]` | DELETE | `users.manage` + step-up |
| `/api/admin/users/[id]/revoke` | POST | `users.manage` |
| `/api/admin/webhooks` | GET, POST | `webhooks.manage` |
| `/api/admin/webhooks/[id]` | PATCH, DELETE | `webhooks.manage` |
| `/api/admin/webhooks/[id]/test` | POST | `webhooks.manage` |
| `/api/admin/webhooks/[id]/deliveries` | GET | `webhooks.manage` |
| `/api/admin/webhooks/[id]/deliveries/[deliveryId]/retry` | POST | `webhooks.manage` |
| `/api/admin/retention/purge` | GET, POST | `retention.purge` + step-up |
| `/api/admin/retention/audit/purge` | GET, POST | `audit.purge` (owner) + step-up |

### Admin GICN
| Endpoint | Methods | Permission |
|---|---|---|
| `/api/admin/gicn/programs` | POST | `gicn.manage` |
| `/api/admin/gicn/programs/[id]` | PATCH, DELETE | `gicn.manage` |
| `/api/admin/gicn/checkin` | POST | `gicn.checkin` |
| `/api/admin/gicn/registrations/[id]/decide` | POST | `gicn.manage` |
| `/api/admin/gicn/registrations/[id]/promote` | POST | `gicn.manage` |
| `/api/admin/gicn/registrations/[id]/certificate` | GET | `gicn.manage` |
| `/api/admin/gicn/scholarships` | GET, POST | `scholarship.review` |
| `/api/admin/gicn/scholarships/[id]` | GET | `scholarship.review` |
| `/api/admin/gicn/scholarships/[id]/decide` | POST | `scholarship.review` |
| `/api/admin/gicn/scholarships/[id]/conditions` | POST, PATCH | `scholarship.review` |
| `/api/admin/gicn/scholarships/[id]/academic` | POST | `scholarship.review` |
| `/api/admin/gicn/scholarships/[id]/disbursements` | POST, PATCH | `scholarship.disburse` |
| `/api/admin/gicn/scholarships/[id]/payout` | POST | `scholarship.disburse` |
| `/api/admin/gicn/scholarships/[id]/reveal` | POST | `scholarship.disburse` + step-up (NIN/bank) |
| `/api/admin/gicn/scholarships/[id]/documents/[docId]` | GET | `scholarship.review` |
| `/api/admin/gicn/sponsorships/[id]` | PATCH | `gicn.manage` |
| `/api/admin/gicn/sponsorships/[id]/verify` | POST | `gicn.manage` |
| `/api/admin/gicn/sponsorships/[id]/refund` | POST | `gicn.manage` |
| `/api/admin/gicn/sponsorships/reconcile` | POST | `gicn.manage` |
| `/api/admin/gicn/sponsorships/export` | GET | `gicn.manage` |
| `/api/admin/gicn/impact/export` | GET | `gicn.manage` |

## 6. Cron ⏰ (`CRON_SECRET`, GET+POST)

| Endpoint | Schedule | What it does |
|---|---|---|
| `/api/cron/webhooks/retry` | Vercel | Re-attempt due webhook deliveries, escalate backoff, dead-letter at 5 |
| `/api/cron/cleanup` | daily 04:00 (`vercel.json`) | Purge expired magic-link / email-change / session rows |
| `/api/cron/classify/process` | daily 04:30 (`vercel.json`) | Drain pending bulk-classification jobs (backstop) |
| `/api/cron/gicn/reconcile-payments` | ~30 min (GH Actions) | Reconcile stale `pending` sponsorships against Paystack |
| `/api/cron/gicn/reminders` | daily (GH Actions) | Check-in reminders for upcoming programmes |
| `/api/cron/gicn/scholarship-reminders` | daily (GH Actions) | Renewal + at-risk scholarship nudges |

## 7. Integration 🔗

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/gicn/sponsor/webhook` | POST | Paystack HMAC-SHA512 signature |
| `/api/webhooks/inbound` | POST | `GBN_WEBHOOK_RECEIVER_SECRET` |
