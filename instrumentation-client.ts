// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Browser DSN must be inlined at build time (NEXT_PUBLIC_*). Without it,
// Sentry.init is skipped and the browser SDK is a no-op.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production",
    tracesSampleRate: 0.1,
    // Browser-only sampling for replay; off by default — flip on for incident triage
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    enabled: process.env.NODE_ENV === "production",
    ignoreErrors: [
      // User cancelled a network request (e.g., navigated away)
      "AbortError",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed",
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
