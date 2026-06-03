import { track as vercelTrack } from "@vercel/analytics";

/**
 * Typed funnel events. Keeping the names in one place means the dashboard
 * stays clean and we can reason about the conversion funnel as a whole:
 *
 *   cta_click → estimator_complete / quiz_complete → intake_start →
 *   intake_step (×N) → intake_submit (or intake_error)
 */
export type FunnelEvent =
  | "cta_click"
  | "estimator_complete"
  | "prescreener_complete"
  | "cbn_check"
  | "quiz_complete"
  | "lead_magnet_submit"
  | "intake_start"
  | "intake_step"
  | "intake_submit"
  | "intake_error"
  | "whatsapp_click";

type Props = Record<string, string | number | boolean | null>;

/** Fire a funnel event. No-op (silently) when analytics isn't active. */
export function track(event: FunnelEvent, props?: Props) {
  try {
    vercelTrack(event, props);
  } catch {
    /* analytics disabled / blocked — never let tracking break a flow */
  }
}
