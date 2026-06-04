import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { FUNNEL_EVENTS } from "@/lib/analyticsEvents";

const ALLOWED = new Set<string>(FUNNEL_EVENTS);

// Anonymous first-party event ingest. Public + fire-and-forget from the client;
// unknown events and abuse are dropped silently (always 204 so the client never
// retries or surfaces an error).
export async function POST(req: NextRequest) {
  if (!db) return new NextResponse(null, { status: 204 });

  const rl = rateLimit(`track:${getClientIp(req)}`, 300, 60 * 60);
  if (!rl.ok) return new NextResponse(null, { status: 429 });

  let body: { event?: unknown; props?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (!ALLOWED.has(event)) return new NextResponse(null, { status: 204 });

  // Sanitise props: shallow object, primitive values only, capped — no PII paths.
  let props: Record<string, string | number | boolean | null> | undefined;
  if (body.props && typeof body.props === "object" && !Array.isArray(body.props)) {
    const clean: Record<string, string | number | boolean | null> = {};
    let n = 0;
    for (const [k, v] of Object.entries(body.props as Record<string, unknown>)) {
      if (n++ >= 12) break;
      if (typeof v === "string") clean[k] = v.slice(0, 120);
      else if (typeof v === "number" || typeof v === "boolean" || v === null) clean[k] = v;
    }
    if (Object.keys(clean).length) props = clean;
  }

  try {
    await db.analyticsEvent.create({
      data: { name: event, props: props as Prisma.InputJsonValue | undefined },
    });
  } catch (e) {
    console.error("[track] insert failed:", e);
  }
  return new NextResponse(null, { status: 204 });
}
