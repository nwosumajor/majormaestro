"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Fires once when a referred visitor lands (recovery page with a valid ref),
// so the admin funnel can measure referral link → lead conversion.
export default function RefLandingTracker({ code }: { code: string }) {
  useEffect(() => {
    track("ref_landing", { code });
  }, [code]);
  return null;
}
