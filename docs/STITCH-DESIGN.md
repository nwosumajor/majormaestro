# MajorMaestro — Design System

MajorMaestro is a Nigerian enterprise platform for corporate forensic bank-charge
recovery, AI staff placement, and career strategy. The brand voice is that of a
high-trust financial institution: confident, precise, premium, reassuring.
Think "Big-Four audit firm meets modern fintech."

## Design Language
- Aesthetic: institutional authority + clean modern fintech. Generous whitespace,
  calm confidence, zero clutter. Subtle depth only — soft shadows, faint dot/grid
  texture on dark sections, gentle emerald glow accents. Never flashy.

## Color Palette (use exactly)
- Ink / base text & dark sections: `#0b1220` (with `#15233f`, `#1d2f52` for layering)
- Background: `#ffffff` and very light slate (`#f8fafc`, `#f1f5f9`)
- Accent — money / recovery / success, used sparingly as the ONE accent:
  emerald `#059669`, bright `#10b981`, soft fill `#ecfdf5`
- Neutrals: slate-200 borders, slate-500/600 secondary text
- Semantic: amber for caution, rose for errors — used minimally

## Typography
- Display headings: **Fraunces** (serif), semibold, tight tracking — editorial & trustworthy
- Body & UI: **Geist Sans** / Inter-like grotesk, 16px base, line-height 1.5–1.6
- All currency (₦) and numeric figures: **monospace** with tabular figures, bold

## Components
- Rounded-2xl cards, 1px slate borders + soft shadow
- Pill badges/chips with icon + label
- Full-width primary buttons in emerald (`#059669`) on key CTAs; ghost/outline secondary buttons
- Lucide-style line icons only — never emoji

## Trust Signals (everywhere)
- Security badges (AES-256, NDPA 2023 compliant, NDA)
- "No recovery, no fee"
- CBN/BOFIA regulatory references
- Stat counters in monospace figures
- Currency is Nigerian Naira (₦); audience is Nigerian businesses

## Constraints
- Mobile-first, fully responsive (375 / 768 / 1024 / 1440)
- WCAG AA contrast, 44px min touch targets, visible focus states
- Clean semantic HTML + Tailwind-style utility classes
