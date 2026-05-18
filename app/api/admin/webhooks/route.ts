import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { WEBHOOK_EVENTS, type WebhookEvent, generateSecret, isValidFilter } from "@/lib/webhooks";
import type { Prisma } from "@prisma/client";

const URL_RE = /^https:\/\/[^\s]+$/;

export async function GET() {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const hooks = await db.webhook.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    events: WEBHOOK_EVENTS,
    items: hooks.map((h) => ({
      id: h.id,
      label: h.label,
      url: h.url,
      active: h.active,
      events: h.events,
      lastSentAt: h.lastSentAt?.toISOString() ?? null,
      failCount: h.failCount,
      filter: h.filter,
      createdAt: h.createdAt.toISOString(),
      // Mask secret — only return last 6 chars for display
      secretPreview: `…${h.secret.slice(-6)}`,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const admin = await getAdminFromRequest(req);
  const { label, url, events, filter } = (await req.json().catch(() => ({}))) as {
    label?: string;
    url?: string;
    events?: string[];
    filter?: unknown;
  };

  if (!label?.trim()) return NextResponse.json({ error: "Label is required." }, { status: 400 });
  if (!url || !URL_RE.test(url)) return NextResponse.json({ error: "URL must start with https://" }, { status: 400 });
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "Select at least one event." }, { status: 400 });
  }
  const validEvents = events.filter((e): e is WebhookEvent =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e)
  );
  if (validEvents.length === 0) {
    return NextResponse.json({ error: "No recognised events." }, { status: 400 });
  }
  if (filter !== undefined && !isValidFilter(filter)) {
    return NextResponse.json({ error: "Invalid filter shape." }, { status: 400 });
  }

  const secret = generateSecret();
  const hook = await db.webhook.create({
    data: {
      label: label.trim(),
      url,
      secret,
      events: validEvents,
      filter: (filter as Prisma.InputJsonValue) ?? undefined,
    },
  });

  await recordAudit({
    action: "webhook_create",
    actorLabel: admin?.email ?? "admin",
    targetType: "Webhook",
    targetId: hook.id,
    metadata: { label: hook.label, events: hook.events },
  });

  return NextResponse.json({
    id: hook.id,
    label: hook.label,
    url: hook.url,
    secret, // returned ONCE at creation
    events: hook.events,
    active: hook.active,
    filter: hook.filter,
    createdAt: hook.createdAt.toISOString(),
  });
}
