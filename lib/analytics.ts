import { track as vercelTrack } from "@vercel/analytics";
import { type FunnelEvent } from "@/lib/analyticsEvents";

export type { FunnelEvent } from "@/lib/analyticsEvents";

/**
 * Typed funnel events. Names live in lib/analyticsEvents (dependency-free) so
 * the server ingest route shares the same allowlist:
 *
 *   cta_click → estimator_complete / quiz_complete → intake_start →
 *   intake_step (×N) → intake_submit (or intake_error)
 */
type Props = Record<string, string | number | boolean | null>;

/**
 * Fire a funnel event. Sends to BOTH Vercel Web Analytics (charts) and our own
 * /api/track endpoint (first-party DB, surfaced in /admin/analytics).
 * Never throws — tracking must not break a flow.
 */
export function track(event: FunnelEvent, props?: Props) {
  try {
    vercelTrack(event, props);
  } catch {
    /* vercel analytics disabled / blocked */
  }
  // Mirror to our own DB (anonymous). keepalive lets it survive a navigation
  // that the click itself triggers (e.g. a CTA that routes away).
  try {
    if (typeof window !== "undefined") {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, props: props ?? null }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* never let tracking throw */
  }
}
