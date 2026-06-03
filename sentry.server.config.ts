// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    // Performance — keep low in prod; raise for debugging
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Don't capture local dev exceptions unless explicitly enabled
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLE_DEV === "1",
    // Strip noisy framework errors that are not actionable
    ignoreErrors: [
      // Next.js redirect() throws to short-circuit rendering
      "NEXT_REDIRECT",
      // Auth gates use 404 NotFoundError to bail
      "NEXT_NOT_FOUND",
    ],
    // Scrub PII out of breadcrumbs and events before they leave the server
    beforeSend(event) {
      // Strip the gbn_admin and gbn_user cookie values from any captured request
      if (event.request?.cookies) {
        for (const k of ["gbn_admin", "gbn_user", "gbn_oauth"]) {
          if (event.request.cookies[k]) event.request.cookies[k] = "[redacted]";
        }
      }
      // Strip Authorization headers
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = "[redacted]";
      }
      // Strip query-string tokens (magic-link / oauth)
      if (event.request?.query_string && typeof event.request.query_string === "string") {
        event.request.query_string = event.request.query_string.replace(
          /(token|code|state)=[^&]+/g,
          "$1=[redacted]"
        );
      }
      return event;
    },
  });
}
