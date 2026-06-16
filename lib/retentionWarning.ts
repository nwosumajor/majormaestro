import { db } from "@/lib/db";

// Backup heads-up: counts of data that is already eligible for purge OR will
// become eligible within PURGE_WARNING_DAYS, so admins can back up before a
// purge (manual for documents/audit; automatic via the daily cron for analytics).

function envDays(name: string, def: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export interface PurgeWarning {
  key: "documents" | "audit" | "analytics";
  label: string;
  retentionDays: number;
  dueCount: number; // eligible now or within the warning window
  autoPurged: boolean; // true = removed automatically by the daily cleanup cron
}

export interface PurgeWarningResult {
  warnings: PurgeWarning[];
  warningDays: number;
}

export async function getPurgeWarnings(): Promise<PurgeWarningResult> {
  const warningDays = envDays("PURGE_WARNING_DAYS", 14);
  if (!db) return { warnings: [], warningDays };

  const ms = 24 * 60 * 60 * 1000;
  // Items whose purge date (created/closed + retention) is on or before this are
  // due now or within the warning window.
  const soonCutoff = (retentionDays: number) => new Date(Date.now() - retentionDays * ms + warningDays * ms);

  const retDocs = envDays("RETENTION_DAYS", 1095);
  const retAudit = envDays("AUDIT_LOG_RETENTION_DAYS", 730);
  const retAnalytics = envDays("ANALYTICS_RETENTION_DAYS", 180);

  const [docs, audit, analytics] = await Promise.all([
    db.uploadedDocument.count({ where: { complaint: { closedAt: { lte: soonCutoff(retDocs) } } } }),
    db.auditLog.count({ where: { createdAt: { lt: soonCutoff(retAudit) } } }),
    db.analyticsEvent.count({ where: { createdAt: { lt: soonCutoff(retAnalytics) } } }),
  ]);

  const warnings: PurgeWarning[] = (
    [
      { key: "documents", label: "case document(s)", retentionDays: retDocs, dueCount: docs, autoPurged: false },
      { key: "audit", label: "audit-log entr(ies)", retentionDays: retAudit, dueCount: audit, autoPurged: false },
      { key: "analytics", label: "analytics event(s)", retentionDays: retAnalytics, dueCount: analytics, autoPurged: true },
    ] as PurgeWarning[]
  ).filter((w) => w.dueCount > 0);

  return { warnings, warningDays };
}
