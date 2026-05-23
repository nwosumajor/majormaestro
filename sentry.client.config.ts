import * as Sentry from "@sentry/nextjs";

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
