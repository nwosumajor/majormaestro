import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { dispatchTest } from "@/lib/webhooks";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req, "webhooks.manage");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const admin = await getAdminFromRequest(req);
  const { id } = await ctx.params;

  try {
    await dispatchTest(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Test fire failed." },
      { status: 400 }
    );
  }

  // Fetch the latest delivery to surface back to the admin
  const delivery = await db.webhookDelivery.findFirst({
    where: { webhookId: id, event: "test" },
    orderBy: { createdAt: "desc" },
  });

  await recordAudit({
    action: "webhook_test_fire",
    actorLabel: admin?.email ?? "admin",
    targetType: "Webhook",
    targetId: id,
    metadata: { deliveryId: delivery?.id, status: delivery?.status, responseCode: delivery?.responseCode },
  });

  return NextResponse.json({
    success: true,
    delivery: delivery && {
      id: delivery.id,
      status: delivery.status,
      attempts: delivery.attempts,
      responseCode: delivery.responseCode,
      responseBody: delivery.responseBody,
    },
  });
}
