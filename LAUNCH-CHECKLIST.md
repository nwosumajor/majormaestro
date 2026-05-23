# Launch Checklist — Manual Browser Walkthrough

Work through this **before** opening the platform to real users. Every checkbox must pass.

**How to use:**
1. Open a fresh browser profile (or incognito) — no cached cookies.
2. Have these tabs ready: production URL, Resend dashboard, Sentry dashboard, your test inbox, the Postgres console (`psql` or Supabase SQL editor).
3. Work through each section top to bottom. Don't skip ahead — later steps depend on state from earlier ones.

**Estimated time:** 90 minutes for a careful pass.

## Test email convention

**Always use real, deliverable addresses you own.** Never use `@example.com`, `@test.com`, or made-up domains — they bounce, generating noise in Resend and slowly damaging sender reputation.

Use Gmail/Workspace `+tag` aliases so every flow has a distinct trackable address but everything lands in your one main inbox:

| Flow | Address to use |
|---|---|
| Magic-link sign-in | `nwosumajor+magiclink@gmail.com` |
| Lead-magnet capture | `nwosumajor+lead@gmail.com` |
| Complaint intake (corporate client) | `nwosumajor+intake@gmail.com` |
| Email-change verification | `nwosumajor+newemail@gmail.com` |
| Referral programme | `nwosumajor+ref@gmail.com` |
| Internal notifications (server-driven) | `forensics@majormaestro.com` |
| Referral commissions | `referrals@majormaestro.com` |

These give two benefits: (1) every email actually delivers so you can visually verify formatting, links, branding; (2) Resend logs them as separate rows so you can search by `+tag` to trace which flow generated which message.

---

## Section A: Anonymous public flows

### A1. Landing page
- [ ] `https://yourdomain.com/` loads in <2s
- [ ] Hero section renders correctly on desktop AND on a phone (real phone, not just dev tools resize)
- [ ] All three CTAs work: "Start Staff Classification", "Build My Career Roadmap", "Recover Bank Overcharges"
- [ ] Navbar shows "Sign in" button on the right (with Google logo)

### A2. Recovery portal
- [ ] `/recovery` loads. The red statute urgency banner at top displays correctly.
- [ ] Sticky quick-nav navigates by anchor: Estimate Recovery, AI Pre-Screen, Eligibility Quiz, CBN Rate Checker, Case Studies, FAQ, Lodge Complaint
- [ ] WhatsApp floating button (bottom-right) opens with the right prefilled message
- [ ] All three sector landing pages render: `/recovery/banking`, `/recovery/fmcg`, `/recovery/manufacturing`

### A3. Recovery interactive tools (each calls AI / API)
- [ ] **Estimator**: pick a turnover band → typical recovery range + timeline appear
- [ ] **AI Pre-Screener**: paste a paragraph, submit → AI summary returned in <30s
- [ ] **Pre-qual quiz**: answer 5 questions → score displayed
- [ ] **CBN rate comparison**: enter a charge above CBN cap → flagged red
- [ ] **Case studies**: cards render with anonymised figures
- [ ] **FAQ accordion**: each section expands/collapses
- [ ] **Lead magnet**: enter `nwosumajor+lead@gmail.com` → success state shown; check Gmail for the guide
- [ ] **Audit log** in DB (psql or `/admin/audit`) shows the AI call audit rows ARE NOT being created (only admin actions should hit AuditLog)

### A4. Intake form
- [ ] `/recovery#intake` scrolls correctly
- [ ] Step 1 (Organisation): all fields validate. "Continue" disabled until required fields filled.
- [ ] Step 2 (Contact): email field rejects "not-an-email". Use `nwosumajor+intake@gmail.com` for the valid run.
- [ ] Step 3 (Compliance): file upload works for at least one PDF and one Excel file
- [ ] Submit fails when compliance checkboxes not ticked (server returns 400 even if you bypass client-side)
- [ ] Submit succeeds → success card with reference ID `GBN-…` appears
- [ ] Confirmation email arrives at the contact email within 60 seconds
- [ ] Internal notification email arrives at `INTERNAL_NOTIFY_EMAIL`
- [ ] Save the reference ID — you'll need it later

### A5. Recovery tracking (no auth)
- [ ] `/recovery/track` loads
- [ ] Enter your reference ID → timeline appears with `received` step done, others pending
- [ ] Enter a fake reference ID → error message displays (not a crash)
- [ ] "Request data export" → enter the contact email → JSON downloads with all your case data
- [ ] Try the export with WRONG email → 404 "no matching record"

### A6. Referral generation (no auth)
- [ ] `/recovery/refer` form generates a code
- [ ] Success state shows the share URL + WhatsApp/email share buttons
- [ ] Click "Track your referrals on your private dashboard" → `/recovery/refer/<code>` renders with 0 leads
- [ ] Open `/recovery?ref=<your-code>` → "Referred via" banner appears on the intake form

---

## Section B: Client portal flows

### B1. Sign in via magic-link
This section has TWO passes — one verifies the email-link mechanics with a fresh identity, the other verifies auto-link of existing cases.

**Pass 1 — fresh identity (no auto-link expected)**
- [ ] Click "Sign in" in the navbar → `/client/signin` loads
- [ ] Click "Email me a sign-in link" → enter `nwosumajor+magiclink@gmail.com` → "Check your inbox" appears
- [ ] Magic-link email arrives in Gmail within 60s (subject: "Your MajorGBN sign-in link")
- [ ] Click the link → lands on `/client/dashboard`
- [ ] Dashboard shows **no** recovery cases (this alias was never used for intake; "Your Leads" is empty)
- [ ] Try clicking the SAME link again → redirects to `/client/signin?error=This sign-in link has already been used.`
- [ ] Sign out via top-right menu

**Pass 2 — auto-link verification**
- [ ] In an incognito window, `/client/signin` → use `nwosumajor+intake@gmail.com` (the address that owns the A4 complaint)
- [ ] After verifying the magic link, dashboard now shows the case from A4 (reference `GBN-…`) under "My Recovery Cases"
- [ ] In the audit log (`/admin/audit` if you have admin open), find the `magic_link_signin` row — `metadata.linkedComplaints` should be 1

### B2. Sign in via Google
- [ ] In a fresh incognito window, click "Sign in" → "Continue with Google"
- [ ] Google account picker opens → choose your account → consent → redirects back to `/client/dashboard`
- [ ] Dashboard shows your name + profile picture from Google
- [ ] Sign out (top-right menu) → cookie cleared, redirected to `/`

### B3. Sign in via Google with a different email
- [ ] Sign in with a Google account whose email is DIFFERENT from any existing complaint contact email
- [ ] Dashboard shows 0 linked cases — auto-link doesn't fire on email mismatch

### B4. Save an assessment while signed in
- [ ] Visit `/assessment`, fill in the form, run the classification
- [ ] Click "Save" → check `SavedClassification` table in DB → row exists with your `userId`
- [ ] Visit `/client/dashboard` → "Saved Classifications" panel shows the entry
- [ ] Visit `/history` → entry appears
- [ ] Delete the entry from `/history` → row gone from DB

### B5. Save a roadmap while signed in
- [ ] Same as B4 but for `/roadmap`
- [ ] Toggle a milestone checkbox → `completedMilestones` array updates in DB

### B6. localStorage migration
- [ ] Sign out
- [ ] Save an assessment while anonymous (it goes to localStorage)
- [ ] Sign back in → MigrationBridge banner: "Imported N classifications…"
- [ ] localStorage entries gone; server entries exist

### B7. Account management
- [ ] `/client/account` loads with profile card
- [ ] Update display name → reflected in dashboard header
- [ ] Email change: enter `nwosumajor+newemail@gmail.com` → confirmation email arrives at NEW address
- [ ] Click the confirmation link → email updated in DB, banner appears
- [ ] Disconnect Google → button greyed out if `emailVerified` is null; otherwise succeeds
- [ ] Reconnect via "Connect" → Google account re-linked

### B8. Sessions
- [ ] `/client/account` → Active sessions panel shows current device
- [ ] Open the site in a second browser → sign in there → both sessions now listed
- [ ] In browser A, click "Sign out everywhere else" → browser B's next request shows signed-out state
- [ ] In browser A, revoke own session → redirects to `/`

### B9. Account deletion
- [ ] `/client/account` → Danger zone → "I want to delete my account"
- [ ] Type wrong email → "Confirmation email did not match"
- [ ] Type correct email → account deleted; redirected to `/?account_deleted=1`
- [ ] Verify in DB: `User` row gone, `SavedClassification`/`SavedRoadmap` gone, `RecoveryComplaint.userId` set to NULL but row preserved
- [ ] Sign in again with the same email → fresh account created; complaints auto-link back

---

## Section C: Admin flows

### C1. Bootstrap (first admin)
- [ ] `/admin/login` → enter your bootstrap email + `ADMIN_PASSWORD` → dashboard loads
- [ ] `AdminUser` row exists in DB with `role="owner"`
- [ ] Audit log shows `admin_login_success`

### C2. 2FA setup
- [ ] `/admin/account` → "Set up 2FA"
- [ ] Scan QR with authenticator app
- [ ] Enter code → 2FA enabled
- [ ] 8 recovery codes shown ONCE — save them to password manager
- [ ] Sign out, sign back in → TOTP prompt appears
- [ ] Wrong TOTP → rejected
- [ ] Correct TOTP → in
- [ ] Sign out, sign in with password + RECOVERY code → succeeds, "remainingRecoveryCodes: 7"
- [ ] Reused recovery code → rejected

### C3. Password change
- [ ] `/admin/account` → Change password card
- [ ] Wrong current password → rejected
- [ ] New password < 12 chars → rejected
- [ ] Correct old, valid new → updated; sign out and back in with new password

### C4. Create a second admin
- [ ] `/admin/users` → Add admin
- [ ] Empty password → rejected
- [ ] Email + 12+ char password → row created
- [ ] Sign out, sign in as new admin → succeeds
- [ ] Owner deletes new admin → confirmation prompt → row gone
- [ ] Cannot delete self → button hidden / rejected

### C5. Case management
- [ ] `/admin` dashboard shows the case you lodged in A4
- [ ] Click into `/admin/cases/GBN-…`
- [ ] Timeline shows `received` done, all other steps pending
- [ ] Internal notes panel: add a note → appears under the form
- [ ] Findings editor: enter recovery amount (e.g., 5000000 = ₦50,000) and findings text → saved
- [ ] Advance case to `reviewing` with a client-facing note → client receives status email
- [ ] Advance through all steps to `recovered`
- [ ] `closedAt` column on the complaint is populated
- [ ] Download PDF report → file is a valid PDF, includes timeline + findings

### C6. Document download
- [ ] On the case detail page, click Download next to one of the uploaded documents
- [ ] File downloads with the original filename
- [ ] Audit log shows `document_download` with actor email

### C7. CSV export
- [ ] `/admin` → Export CSV button
- [ ] File downloads with today's date in filename
- [ ] Opens in Excel/Numbers without warning; columns include `referenceId`, `companyName`, `status`, etc.

### C8. Audit log
- [ ] `/admin/audit` renders with recent entries
- [ ] Filter by action `case_advance` → only those entries
- [ ] Filter by actor email → only that admin's actions

### C9. Webhooks
- [ ] Stand up a test receiver (e.g., webhook.site or a small Node listener)
- [ ] `/admin/webhooks` → Add webhook → enter URL, select `case.status_changed` event
- [ ] Save → secret displayed once → copy
- [ ] Click "Test" → delivery appears in deliveries panel with status `success`
- [ ] Advance any case → real delivery fires
- [ ] Verify HMAC signature using the secret: `sha256(secret, body)` should match `X-GBN-Signature: sha256=…`

### C10. Webhook retry path
- [ ] Replace the receiver URL with `https://httpstat.us/500`
- [ ] Advance a case → delivery row appears with status `pending`, `responseCode=500`
- [ ] Manually trigger the cron endpoint: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/webhooks/retry`
- [ ] After 5 retry attempts (force `nextAttemptAt` in the past if you don't want to wait), delivery → `dead`
- [ ] Click "Retry now" on the dead delivery → re-fires

### C11. Retention previews
- [ ] Dashboard retention card shows current document + audit log counts eligible for purge
- [ ] If both are 0, that's expected for a fresh install
- [ ] If you have eligible rows, click Purge → confirmation prompt → rows deleted, blob storage cleaned

### C12. Email pipeline test
- [ ] Dashboard → "Send test to me" → email arrives at the admin's address
- [ ] Audit log shows `email_test` with resendId

---

## Section D: Security smoke tests

### D1. Auth gate
- [ ] `/admin` without cookie → redirects to `/admin/login`
- [ ] `/api/admin/cases` without cookie → 401 JSON
- [ ] `/client/dashboard` without cookie → redirects to `/client/signin`
- [ ] `/api/client/me` without cookie → 401 JSON

### D2. Headers
Open dev tools → Network tab → any response. Confirm:
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Strict-Transport-Security: max-age=…` (production only)
- [ ] `/admin/*` responses also have `X-Robots-Tag: noindex, nofollow`

### D3. Rate limiting
- [ ] POST `/api/auth/email/start` 6 times within an hour from same IP → 6th returns 429
- [ ] POST `/api/recovery` 6 times within an hour from same IP → 6th returns 429
- [ ] POST `/api/admin/login` 6 times within 15 min from same IP → 6th returns 429

### D4. Cron auth
- [ ] `curl -X POST https://yourdomain.com/api/cron/webhooks/retry` (no auth) → 401
- [ ] Same with `Authorization: Bearer wrongsecret` → 401
- [ ] Same with correct `CRON_SECRET` → 200

### D5. NDPA data export rate limit
- [ ] 6 NDPA data exports in an hour → 6th returns 429

### D6. Token leak protection
- [ ] After signing out (B7), try to use the cookie value from your previous session (paste it back into a request manually) → 401 (the Session row is revoked)

---

## Section E: External services

### E1. Sentry
- [ ] Sentry dashboard shows the project receiving events (test event: visit `/api/nonexistent-route` → 404 logged, not crash)
- [ ] Manually trigger an error somewhere (e.g., temporarily add `throw new Error("test")` in a route, deploy, hit the route) → event appears in Sentry within 30s
- [ ] Verify cookies + Authorization headers are `[redacted]` in the event

### E2. Resend
- [ ] Resend dashboard → Logs shows all the test emails delivered (filter by `+magiclink`, `+lead`, `+intake` aliases to confirm each flow)
- [ ] Open at least one email in Gmail → it landed in Primary, not Spam (if Spam, your SPF/DKIM/DMARC needs work)
- [ ] Resend → Suppressions tab is clean of historic bounce noise (suppress any stale `@example.com` addresses from earlier dev work)

### E3. Backup
- [ ] On the host running `scripts/backup-db.sh`, manually trigger: `npm run backup:db`
- [ ] Verify backup file in `./backups/`
- [ ] If `BACKUP_S3_BUCKET` is set: confirm the file is in the S3 bucket
- [ ] Test a restore against a scratch database: `gunzip < backups/ms2app-*.sql.gz | psql "postgresql://...scratch..."` and confirm tables came back

---

## Section F: Mobile + accessibility

(Less rigorous; do at least the smell-test pass.)

- [ ] Open `/recovery` on an actual phone — buttons are tappable, text readable
- [ ] Open `/client/dashboard` on an actual phone — table doesn't overflow horizontally
- [ ] Tab through `/recovery#intake` using only the keyboard — all fields reachable
- [ ] Tab through `/admin/login` — all fields reachable
- [ ] Screen-reader test on `/recovery` headline (use macOS VoiceOver or NVDA): heading hierarchy makes sense

---

## Section G: Final go/no-go

Before flipping the public DNS:

- [ ] All sections A–E above passed
- [ ] At least one independent person has clicked through a representative subset
- [ ] Sentry has at least one real event captured (proves it's wired)
- [ ] One full backup has been taken AND restored to a scratch DB successfully
- [ ] You've grepped the codebase for any `console.log` left over from development:
  ```bash
  git grep -nE 'console\.(log|warn|info)' -- 'app/' 'lib/'
  ```
- [ ] CLAUDE.md and DEPLOY.md are up to date
- [ ] `git status` is clean; all changes pushed to `main`
- [ ] You have a one-page rollback plan: how do you revert if the launch goes wrong?

---

**When all sections green: you're ready.** Flip DNS, announce, and watch Sentry.
