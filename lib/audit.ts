import { db } from "@/lib/db";

export interface AuditInput {
  action: string;
  actorLabel?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  if (!db) return;
  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        actorLabel: input.actorLabel ?? "admin",
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to record:", err);
  }
}
