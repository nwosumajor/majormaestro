# Google Stitch Prompt Pack — MajorMaestro Frontend Redesign

Prompts for regenerating the public-facing UI in **Google Stitch**
([stitch.withgoogle.com](https://stitch.withgoogle.com)), grounded in the app's real
design tokens so the output maps cleanly onto the existing Tailwind v4 setup.

## How to use this

- **One screen at a time** — do NOT paste all screens at once.
- For each screen, send **one message = the Master Design System block + that one
  screen's prompt**, pasted together. Repeat the Master block every time — Stitch does
  not carry a global design system between separate screens, so repeating it keeps them
  consistent.
- Generate, then **refine with short follow-ups** in the same chat ("make the hero
  darker", "bigger monospace ₦ figures"). Don't re-paste the whole prompt to tweak.
- **Standard mode** for most runs; **Experimental mode** for high-fidelity passes on
  key screens (e.g. `/recovery`).
- **Recommended order:** Nav+Footer → Landing → Recovery → the rest. Once Nav + Landing
  look right, tell later prompts to "match the nav and landing style."
- **Bring back** a screenshot or exported HTML/CSS per screen; it gets re-implemented as
  React components on the existing tokens (`bg-ink`, `text-accent`, `font-display`,
  `font-figure`, `components/ui/*`) — start with `/recovery` to verify the approach.

## Real design tokens (source: `app/globals.css`)

- Ink / base: `#0b1220` · `#15233f` · `#1d2f52`
- Accent (money/recovery): emerald `#059669` → bright `#10b981` → soft `#ecfdf5`
- Background: `#ffffff`, light slate `#f8fafc` / `#f1f5f9`
- Display font: **Fraunces** (serif) · Body: **Geist Sans** · Numbers/₦: **Geist Mono**, tabular figures

---

## ▣ MASTER DESIGN SYSTEM (paste at the start of every screen prompt)

```
You are designing for "MajorMaestro" — a Nigerian enterprise platform for corporate
forensic bank-charge recovery, AI staff placement, and career strategy. The brand
voice is that of a high-trust financial institution: confident, precise, premium,
reassuring. Think "Big-Four audit firm meets modern fintech."

DESIGN LANGUAGE
- Aesthetic: institutional authority + clean modern fintech. Generous whitespace,
  calm confidence, zero clutter. Subtle depth only — soft shadows, faint dot/grid
  texture on dark sections, gentle emerald glow accents. Never flashy.
- Color palette (use exactly):
  • Ink / base text & dark sections: #0b1220 (with #15233f, #1d2f52 for layering)
  • Background: #ffffff and very light slate (#f8fafc, #f1f5f9)
  • Accent — money / recovery / success, used sparingly as the ONE accent: emerald
    #059669, bright #10b981, soft fill #ecfdf5
  • Neutrals: slate-200 borders, slate-500/600 secondary text
  • Semantic: amber for caution, rose for errors — used minimally
- Typography:
  • Display headings: Fraunces (serif), semibold, tight tracking — editorial & trustworthy
  • Body & UI: Geist Sans / Inter-like grotesk, 16px base, line-height 1.5–1.6
  • All currency (₦) and numeric figures: monospace with tabular figures, bold
- Components: rounded-2xl cards, 1px slate borders + soft shadow, pill badges/chips
  with icon + label, full-width primary buttons in emerald (#059669) on key CTAs,
  ghost/outline secondary buttons. Lucide-style line icons only — never emoji.
- Trust signals everywhere: security badges (AES-256, NDPA 2023 compliant, NDA),
  "No recovery, no fee", CBN/BOFIA regulatory references, stat counters.
- Currency is Nigerian Naira (₦). Audience is Nigerian businesses.

CONSTRAINTS
- Mobile-first, fully responsive (375 / 768 / 1024 / 1440).
- WCAG AA contrast, 44px min touch targets, visible focus states.
- Output clean semantic HTML + Tailwind-style utility classes.
```

---

## ▣ SCREEN 1 — Global Nav + Footer

```
[paste Master Design System above]

Design a sticky top navigation bar and a footer for the platform.

NAV: Left = "MajorMaestro" wordmark (Fraunces) with a small emerald shield mark.
Center/right links: Forensic Recovery, AI Assessment, Career Roadmap, GICN. Right:
a ghost "Track a Case" button and a solid emerald "Lodge a Complaint" CTA. On mobile,
collapse to a hamburger drawer. Transparent over dark hero, solid white on scroll.

FOOTER: dark ink (#0b1220) background, faint dot grid. 4 columns — Company, Services
(Recovery, Assessment, Roadmap, GICN), Legal (Privacy, NDPA, Terms), Contact (email,
phone, Lagos office). Bottom row: copyright, security badges (NDPA 2023, AES-256),
social icons. Emerald accent on hovers.
```

## ▣ SCREEN 2 — Landing / Home (`/`)

```
[paste Master Design System above]

Design the homepage hero + overview for a platform with THREE flagship services.

HERO (dark ink background, faint grid texture, emerald glow): a Fraunces headline
like "Recover what your bank quietly took. Place the right people. Plan the climb."
Sub-line explaining the three pillars. Two CTAs: emerald "Start Forensic Recovery"
and ghost "Explore the Platform". A row of trust stats (₦400M+ recovered, 60+
organisations, CBN/BOFIA-grade) in monospace figures.

THREE PILLAR CARDS (below hero, white): equal cards with line icon, title, 1-line
value prop, and "Learn more →":
 1. Corporate Forensic Recovery — recover excess bank charges, zero-risk 30% success fee
 2. AI Staff Classification — match staff to best-fit departments with AI
 3. Strategic Career Roadmap — a year-by-year plan to a target role
Then a slim band for GICN (the NGO/youth arm) and a closing CTA section.
```

## ▣ SCREEN 3 — Forensic Recovery (`/recovery`) — flagship, long-scroll

```
[paste Master Design System above]

Design a long, conversion-focused B2B landing page for "Corporate Forensic Recovery"
— recovering illegitimate bank deductions (excess interest, COT, LC/SWIFT charges)
under CBN & BOFIA regulations, on a zero-risk 30% success-fee model.

Sections, in order:
1. HERO (dark ink, grid texture, emerald glow): Fraunces headline e.g. "Your bank
   has been overcharging you. We get it back." Sub-line. CTAs: "Estimate Your
   Recovery" + "Lodge a Complaint". Trust chips: NDPA 2023, NDA before disclosure,
   No recovery–No fee. Quick links: Track Case, Refer & Earn.
2. PROBLEM/EDUCATION strip: common hidden charges (excess COT, interest above agreed
   rate, inflated LC confirmation & SWIFT fees) as icon list.
3. RECOVERY ESTIMATOR (signature interactive card): a dropdown of annual turnover
   bands — ₦5M–₦49M, ₦50M–₦200M, ₦200M–₦1B, ₦1B–₦5B, Above ₦5B — that reveals a
   "Typical Recovery Range" + "Estimated Timeline" in a green result panel, with a
   "Start my recovery" CTA. Big monospace figures.
4. SME SECTION: a block targeting small & medium businesses (₦5M–₦49M turnover):
   headline "Think excess charges only hurt big corporates? Think again.", 3 benefit
   cards (zero upfront cost, fast 3–5 week audits, built for your size), a list of
   typical SME overcharges, and a highlighted "Typical SME recovery: ₦150,000–₦1.2M"
   estimate card with CTA.
5. SIX-STEP PROCESS: numbered timeline cards — Engagement → Document Collection →
   Forensic Analysis → Findings Report → Bank Engagement → Recovery.
6. CASE STUDIES: 3 anonymised recovery results with amounts (monospace) and charge types.
7. FORENSIC TEAM: "Forensic Leadership" — leadership cards with circular avatar (or
   initial), name, title (Managing Partner), credential chips (Audit & Forensic
   Banking, AML/CFT, SWIFT/UCP600, PMP), short bio; plus a contact card (email, phone,
   Lagos office). Centered when a single member.
8. FAQ accordion. 9. Lead-magnet (free guide email capture).
10. SECURE INTAKE FORM (dark section): multi-field complaint form — company, RC number,
    turnover band, banks used, document upload, NDPA/NDA acknowledgement checkboxes,
    submit. Heavy security framing.
11. Floating WhatsApp CTA.
```

## ▣ SCREEN 4 — Referral Program (`/recovery/refer`)

```
[paste Master Design System above]

Design a referral-program landing page. Hero: "Refer & Earn" with a gift icon.
THREE benefit cards: "₦50K–₦200K tiered bonus per completed audit", "5% of recovered
amount", "No cap". A tiered table "Bonus by referred company size": ₦5M–₦49M → ₦50,000;
₦50M–₦200M → ₦75,000; ₦200M–₦1B → ₦100,000; ₦1B+ / high-volume LC trade finance →
₦200,000. A "How it works" 4-step row. A form to generate a tracked referral link,
then a share panel (copy link, WhatsApp, email). Trust signals (NDA protected, no risk
to referees). Use emerald for all reward figures (monospace).
```

## ▣ SCREEN 5 — AI Staff Classification (`/assessment`)

```
[paste Master Design System above]

Design an AI assessment form + results screen. FORM: a clean multi-section form
capturing Psychological, Mental, Social and Environmental attributes plus
"Certificates Acquired" (add-multiple chips). Confident, exam-like but friendly.
RESULTS: shows the Top 3 best-fit departments as ranked cards (rank badge, department
name, industry category, reasoning paragraph, confidence indicator). Include a loading/
analysing state with a subtle animation.
```

## ▣ SCREEN 6 — Career Roadmap (`/roadmap`)

```
[paste Master Design System above]

Design a "Strategic Career Partner" page. FORM: current role/state + desired future
role (1–15 years). RESULT: a clean vertical timeline — each milestone node shows a
timeframe label (e.g. "Year 1–2"), milestone name, strategic reasoning, and a list of
recommended certifications as chips. Editorial, aspirational, Fraunces headings.
```

## ▣ SCREEN 7 — GICN (`/gicn`)

```
[paste Master Design System above]

Design the landing page for "GICN — Global Impact Christian Network", a youth/NGO arm
(programme registration, check-in, certificates, sponsorship). Warmer, hopeful variant
of the same system (keep ink + emerald, add a slightly softer feel). Hero with mission
statement + "Sponsor a child" and "Register" CTAs. Sections: programmes overview,
sponsorship impact (with ₦ amounts, monospace), how it works, and a sponsor CTA.
NOTE: minors are never account holders — copy speaks to parents/guardians and schools.
```

## ▣ SCREEN 8 — Public Case Tracking (`/recovery/track`)

```
[paste Master Design System above]

Design a case-tracking page: a lookup field (reference ID like GBN-XXXX + email), then
a status view showing a stepper of the 7 recovery stages (received → reviewing →
documents → auditing → findings → engagement → recovered), the current stage
highlighted in emerald, plus case meta and an NDPA data-export button.
```

---

## Bring back to integrate

Per screen, export from Stitch and provide **either**:
1. **Screenshots** (fastest — rebuilt as React/Tailwind components), or
2. **Exported HTML/CSS** (layout/spacing ported into the component system).

Re-implementation maps everything onto existing tokens so the live app updates without
breaking auth, forms, or data wiring. Do it incrementally — `/recovery` first, verify,
then the rest.
