import { db } from "@/lib/db";
import { Webhook } from "lucide-react";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import WebhooksPanel from "./WebhooksPanel";
import { STEP_KEYS, STEP_DEFS } from "@/lib/recoverySteps";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const hooks = await db.webhook.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <Webhook size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Webhooks</h1>
          <p className="text-xs text-slate-500">
            Fire HTTPS POSTs to your CRM/Slack/Zapier on case events. Signed with HMAC-SHA256 (header <span className="font-mono">X-GBN-Signature: sha256=…</span>). Failed deliveries retry on an exponential backoff (1m, 5m, 30m, 2h, 12h) and dead-letter after 5 attempts.
          </p>
        </div>
      </div>

      <WebhooksPanel
        events={[...WEBHOOK_EVENTS]}
        statusOptions={STEP_KEYS.map((k) => ({ key: k, label: STEP_DEFS[k].label }))}
        initialHooks={hooks.map((h) => ({
          id: h.id,
          label: h.label,
          url: h.url,
          active: h.active,
          events: h.events,
          filter: h.filter as Record<string, unknown> | null,
          lastSentAt: h.lastSentAt?.toISOString() ?? null,
          failCount: h.failCount,
          secretPreview: `…${h.secret.slice(-6)}`,
        }))}
      />
    </div>
  );
}
