import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attemptDelivery } from "@/lib/webhooks";
import { getAdminFromRequest } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; deliveryId: string }> }
) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id, deliveryId } = await ctx.params;
  const admin = await getAdminFromRequest(req);

  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });
  if (!delivery || delivery.webhookId !== id) {
    return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  }
  if (delivery.status === "success") {
    return NextResponse.json({ error: "Delivery already succeeded." }, { status: 409 });
  }

  // Reset to pending if dead — manual retry overrides the dead-letter state.
  if (delivery.status === "dead") {
    await db.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "pending", attempts: Math.max(0, delivery.attempts - 1) },
    });
  }

  const body = JSON.stringify(delivery.payload);
  await attemptDelivery(deliveryId, delivery.webhook.url, body, delivery.signature, delivery.webhookId);

  const after = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { status: true, attempts: true, responseCode: true, responseBody: true },
  });

  await recordAudit({
    action: "webhook_delivery_retry",
    actorLabel: admin?.email ?? "admin",
    targetType: "WebhookDelivery",
    targetId: deliveryId,
    metadata: { webhookId: id, status: after?.status, responseCode: after?.responseCode },
  });

  return NextResponse.json({ success: true, delivery: after });
}
