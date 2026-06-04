// Dependency-free event allowlist — shared by the client tracker (lib/analytics)
// and the server ingest route (/api/track) so they can't drift, without pulling
// the client @vercel/analytics package into server bundles.

export const FUNNEL_EVENTS = [
  "cta_click",
  "estimator_complete",
  "prescreener_complete",
  "cbn_check",
  "quiz_complete",
  "lead_magnet_submit",
  "intake_start",
  "intake_step",
  "intake_submit",
  "intake_error",
  "whatsapp_click",
  "bulk_upload",
  "bulk_complete",
  "position_create",
  "ref_landing",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
