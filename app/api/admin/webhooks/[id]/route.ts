import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req, "webhooks.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;
  const admin = await getAdminFromRequest(req);

  const { active } = (await req.json().catch(() => ({}))) as { active?: boolean };
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required." }, { status: 400 });
  }

  const hook = await db.webhook.update({
    where: { id },
    data: { active, ...(active ? { failCount: 0 } : {}) },
  });

  await recordAudit({
    action: active ? "webhook_enable" : "webhook_disable",
    actorLabel: admin?.email ?? "admin",
    targetType: "Webhook",
    targetId: id,
    metadata: { label: hook.label },
  });

  return NextResponse.json({ success: true, active: hook.active });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req, "webhooks.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;
  const admin = await getAdminFromRequest(req);

  const hook = await db.webhook.findUnique({ where: { id } });
  if (!hook) return NextResponse.json({ error: "Webhook not found." }, { status: 404 });

  await db.webhook.delete({ where: { id } });
  await recordAudit({
    action: "webhook_delete",
    actorLabel: admin?.email ?? "admin",
    targetType: "Webhook",
    targetId: id,
    metadata: { label: hook.label },
  });

  return NextResponse.json({ success: true });
}
