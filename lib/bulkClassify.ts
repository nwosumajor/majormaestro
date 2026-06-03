import ExcelJS from "exceljs";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { runClassification, buildDynamicResultSchema, resolvePositionId } from "@/lib/classify";
import {
  ATTRIBUTE_FIELDS,
  TEMPLATE_COLUMNS,
  parseCertificates,
  type AllowedPosition,
  type ClassificationInput,
} from "@/lib/classificationSchema";

// ─── Upload parsing ─────────────────────────────────────────────────────────

export interface ParsedStaffRow {
  staffName: string;
  staffRef: string | null;
  input: ClassificationInput;
}
export interface RejectedRow {
  rowNumber: number;
  reason: string;
}
export interface ParsedUpload {
  rows: ParsedStaffRow[];
  rejected: RejectedRow[];
  missingColumns: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// header → canonical column key (accepts either the machine key or the label)
const HEADER_LOOKUP = new Map<string, string>();
for (const col of TEMPLATE_COLUMNS) {
  HEADER_LOOKUP.set(norm(col.key), col.key);
  HEADER_LOOKUP.set(norm(col.label), col.key);
}
const REQUIRED_KEYS = ["staffName", ...ATTRIBUTE_FIELDS.map((f) => f.key)];

function buildRow(record: Record<string, string>, rowNumber: number): ParsedStaffRow | RejectedRow {
  const get = (k: string) => (record[k] ?? "").trim();
  const missing = REQUIRED_KEYS.filter((k) => !get(k));
  if (missing.length) {
    const labels = missing.map((k) => TEMPLATE_COLUMNS.find((c) => c.key === k)?.label ?? k);
    return { rowNumber, reason: `Missing required field(s): ${labels.join(", ")}` };
  }
  return {
    staffName: get("staffName"),
    staffRef: get("staffRef") || null,
    input: {
      psychological: get("psychological"),
      mental: get("mental"),
      social: get("social"),
      environmental: get("environmental"),
      certificates: parseCertificates(get("certificates")),
    },
  };
}

/** Map an array of header cells to canonical keys; returns the keys + which required columns are missing. */
function resolveHeaders(headers: string[]): { keys: (string | null)[]; missingColumns: string[] } {
  const keys = headers.map((h) => HEADER_LOOKUP.get(norm(h ?? "")) ?? null);
  const present = new Set(keys.filter(Boolean) as string[]);
  const missingColumns = REQUIRED_KEYS.filter((k) => !present.has(k)).map(
    (k) => TEMPLATE_COLUMNS.find((c) => c.key === k)?.label ?? k
  );
  return { keys, missingColumns };
}

export async function parseUpload(buffer: Buffer, filename: string): Promise<ParsedUpload> {
  const isCsv = /\.csv$/i.test(filename);
  const records: Record<string, string>[] = [];
  let missingColumns: string[] = [];

  if (isCsv) {
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const matrix = parsed.data as unknown as string[][];
    if (!matrix.length) return { rows: [], rejected: [], missingColumns: REQUIRED_KEYS };
    const { keys, missingColumns: mc } = resolveHeaders(matrix[0].map((c) => String(c ?? "")));
    missingColumns = mc;
    for (let i = 1; i < matrix.length; i++) {
      const rec: Record<string, string> = {};
      matrix[i].forEach((cell, idx) => {
        const key = keys[idx];
        if (key) rec[key] = String(cell ?? "");
      });
      records.push(rec);
    }
  } else {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return { rows: [], rejected: [], missingColumns: REQUIRED_KEYS };
    const headerCells = (ws.getRow(1).values as unknown[]).slice(1).map((c) => String(c ?? ""));
    const { keys, missingColumns: mc } = resolveHeaders(headerCells);
    missingColumns = mc;
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const rec: Record<string, string> = {};
      (row.values as unknown[]).slice(1).forEach((cell, idx) => {
        const key = keys[idx];
        if (key) rec[key] = cell == null ? "" : String(typeof cell === "object" && "text" in cell ? (cell as { text: string }).text : cell);
      });
      records.push(rec);
    });
  }

  if (missingColumns.length) return { rows: [], rejected: [], missingColumns };

  const rows: ParsedStaffRow[] = [];
  const rejected: RejectedRow[] = [];
  records.forEach((rec, i) => {
    // skip fully-empty rows silently
    if (!Object.values(rec).some((v) => (v ?? "").trim())) return;
    const result = buildRow(rec, i + 2); // +2: 1-based + header row
    if ("reason" in result) rejected.push(result);
    else rows.push(result);
  });

  return { rows, rejected, missingColumns: [] };
}

// ─── Background processor ────────────────────────────────────────────────────

const BULK_INSTRUCTIONS = `- Rank up to 3 best-fit positions for this staff member, 1 (best fit) first.
- departmentName MUST be chosen exactly from the allowed list above — do not invent positions.
- industryCategory must be the exact bracket label for the chosen department.
- confidence is an integer 0–100 representing fit strength.
- reasoning MUST cite the specific attributes and/or certifications from the profile that drove this placement (2–4 sentences).
- Prefer diversity of industryCategory across the ranks where the profile supports it.`;

/**
 * Drains pending StaffClassification rows. Mirrors lib/webhooks.ts:processRetries
 * — called both by /api/cron/classify/process (drain all) and, immediately after
 * upload, via after(() => processClassificationQueue({ batchId })) so small
 * batches finish without waiting for cron. Per-row try/catch isolates failures.
 */
export async function processClassificationQueue(opts?: {
  batchId?: string;
  maxRows?: number;
}): Promise<{ processed: number; remaining: number }> {
  if (!db) return { processed: 0, remaining: 0 };
  const maxRows = opts?.maxRows ?? 25;
  const where = { status: "pending", ...(opts?.batchId ? { batchId: opts.batchId } : {}) } as const;

  const allowedCache = new Map<string, AllowedPosition[]>();
  const touched = new Set<string>();
  let processed = 0;

  for (let i = 0; i < maxRows; i++) {
    const row = await db.staffClassification.findFirst({ where, orderBy: { createdAt: "asc" } });
    if (!row) break;
    touched.add(row.batchId);

    let allowed = allowedCache.get(row.batchId);
    if (!allowed) {
      const batch = await db.classificationBatch.findUnique({
        where: { id: row.batchId },
        select: { selectedPositionIds: true, status: true },
      });
      const ids = batch?.selectedPositionIds ?? [];
      const positions = ids.length
        ? await db.position.findMany({
            where: { id: { in: ids } },
            select: { id: true, departmentName: true, industryCategory: true },
          })
        : [];
      allowed = positions.map((p) => ({
        positionId: p.id,
        departmentName: p.departmentName,
        industryCategory: p.industryCategory,
      }));
      allowedCache.set(row.batchId, allowed);
      if (batch?.status === "pending") {
        await db.classificationBatch.update({ where: { id: row.batchId }, data: { status: "processing" } });
      }
    }

    try {
      if (allowed.length === 0) throw new Error("No target positions selected for this batch.");
      const input = row.inputAttributes as unknown as ClassificationInput;
      const schema = buildDynamicResultSchema(allowed);
      const out = await runClassification({ input, allowed, schema, instructions: BULK_INSTRUCTIONS });
      const results = out.results
        .map((r) => {
          const resolved = resolvePositionId(allowed!, r.departmentName);
          return {
            rank: r.rank,
            positionId: resolved?.positionId ?? null,
            departmentName: r.departmentName,
            industryCategory: resolved?.industryCategory ?? r.industryCategory,
            confidence: r.confidence,
            reasoning: r.reasoning,
          };
        })
        .sort((a, b) => a.rank - b.rank);
      await db.staffClassification.update({ where: { id: row.id }, data: { status: "complete", results } });
    } catch (err) {
      await db.staffClassification.update({
        where: { id: row.id },
        data: { status: "failed", error: err instanceof Error ? err.message.slice(0, 500) : "Classification failed" },
      });
    }
    await db.classificationBatch.update({ where: { id: row.batchId }, data: { completed: { increment: 1 } } });
    processed++;
  }

  // Finalize batches that have no pending rows left.
  if (opts?.batchId) touched.add(opts.batchId);
  for (const bId of touched) {
    const pendingLeft = await db.staffClassification.count({ where: { batchId: bId, status: "pending" } });
    if (pendingLeft === 0) {
      await db.classificationBatch.update({ where: { id: bId }, data: { status: "complete" } });
    }
  }

  const remaining = await db.staffClassification.count({ where });
  return { processed, remaining };
}
