# Go-Live Checklist — Final Manual Steps

Three human-in-the-loop items remain before launch. Everything that can be wired
from code is done and verified (RBAC, Sentry, GICN crons, Paystack env, Google
OAuth config). These three need a real person clicking, plus a server-side
confirmation we can run afterward.

**Suggested order:** #2 (test mode) → #1 → #3, then swap Paystack to the live key.
Items #1 and #2 are the real go/no-go gates; #3 is hygiene.

---

## ☐ 1. Google OAuth — confirm consent screen is *Published*

**Why it matters:** A consent screen left in "Testing" mode lets the owner sign in
but silently blocks every non-test user **after** they pick their account —
invisible to any automated check.

**Do:**
1. Google Cloud Console → **APIs & Services → OAuth consent screen**.
2. Confirm **Publishing status = "In production"**. If "Testing", click
   **Publish app** → confirm.
3. From a browser **not** signed into the owner account (incognito + a different
   Google account that is *not* a test user): go to
   `https://majormaestro.com/client/signin` → **Continue with Google** → pick the
   account → **Allow**.

**Pass criteria:** Land back on `/client/dashboard`, signed in. No "Access blocked:
app not verified / has not completed testing" screen.

**Server-side verify:** Confirm a `User` + `Session` row was created and the
sign-in was audit-logged for the test account.

> An *unverified* app still works but shows an "unverified" warning and caps at 100
> users — fine for launch; submit for verification later if scale demands it.

---

## ☐ 2. Paystack — one real end-to-end sponsorship

**Why it matters:** The only payment path that has never had a live transaction
flow through it. Proves checkout → `charge.success` webhook → `Sponsorship` flips
to `paid` → receipt email.

**Do (use Paystack *test mode* first if a `sk_test_` key is set):**
1. `https://majormaestro.com/gicn/sponsor` → fill form → submit → redirected to
   Paystack hosted checkout.
2. Pay with the test card `4084 0840 8408 4081`, any future expiry, any CVV,
   OTP `123456`.
3. Redirected back to `/gicn/sponsor/complete`.

**Pass criteria:** Completion page shows success; sponsor receives the receipt
email; the `Sponsorship` shows `paid` in `/admin/gicn/sponsorships`.

**Server-side verify:** Confirm the `Sponsorship` row flipped to `paid` (via the
webhook, with the reconcile cron a subsequent no-op) and the webhook signature
verified. In Paystack dashboard → **Webhooks**, confirm URL =
`https://majormaestro.com/api/gicn/sponsor/webhook` and the test delivery shows
`200`.

> If validated on a `sk_test_` key, swap to the `sk_live_` key in Vercel and
> redeploy before launch — never go live on a test key.

---

## ☐ 3. Resend — suppress old `@example.com` bounces

**Why it matters:** Sender-reputation hygiene. Old smoke tests left `@example.com`
addresses bouncing, which slowly erodes deliverability. Non-blocking but worth
clearing.

**Do:**
1. Resend dashboard → **Suppressions**.
2. Add the bounced `@example.com` addresses from the delivery log.
3. (Optional) Confirm domain `majormaestro.com` still shows SPF/DKIM/DMARC verified.

**Pass criteria:** No further `@example.com` bounce attempts in the log.

**Server-side verify:** Dashboard-only (not visible from code), but a probe send via
`/api/admin/email-test` confirms live delivery still returns a real message ID.

---

_Last updated 2026-06-12._
