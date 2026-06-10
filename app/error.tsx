"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

// Route-segment error boundary: catches render/runtime errors below the root
// layout, reports them to Sentry, and offers a graceful recovery (the layout —
// nav/footer — stays intact). app/global-error.tsx still covers root crashes.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 py-20">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Something went wrong</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">We hit an unexpected error</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The issue has been logged and our team has been notified. You can try again, or head back and pick up where you left off.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-slate-400">Ref: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-bright"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
