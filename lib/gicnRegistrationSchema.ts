import ExcelJS from "exceljs";
import Papa from "papaparse";

/**
 * Single source of truth for the school bulk-registration columns — used by BOTH
 * the .xlsx template generator and the upload parser so they can't drift
 * (mirrors lib/classificationSchema.ts). Minors are records only; the school
 * partner attests parental/guardian consent per row.
 */
export const BULK_REG_COLUMNS = [
  { key: "fullName", label: "Full Name", required: true },
  { key: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", required: true },
  { key: "classLevel", label: "Class / Level", required: false },
  { key: "guardianName", label: "Parent/Guardian Name", required: true },
  { key: "guardianConsent", label: "Guardian Consent (yes/no)", required: true },
  { key: "mediaRelease", label: "Media Release (yes/no)", required: false },
  { key: "address", label: "Address", required: false },
] as const;

export interface ParsedParticipantRow {
  fullName: string;
  dateOfBirth: Date;
  classLevel: string | null;
  guardianName: string;
  mediaReleaseGranted: boolean;
  address: string | null;
}
export interface RejectedRow {
  rowNumber: number;
  reason: string;
}
export interface ParsedBulkRegistration {
  rows: ParsedParticipantRow[];
  rejected: RejectedRow[];
  missingColumns: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_LOOKUP = new Map<string, string>();
for (const c of BULK_REG_COLUMNS) {
  HEADER_LOOKUP.set(norm(c.key), c.key);
  HEADER_LOOKUP.set(norm(c.label), c.key);
}
const REQUIRED = BULK_REG_COLUMNS.filter((c) => c.required).map((c) => c.key);

function truthy(v: string): boolean {
  return ["yes", "y", "true", "1"].includes(v.trim().toLowerCase());
}

function resolveHeaders(headers: string[]) {
  const keys = headers.map((h) => HEADER_LOOKUP.get(norm(h ?? "")) ?? null);
  const present = new Set(keys.filter(Boolean) as string[]);
  const missingColumns = REQUIRED.filter((k) => !present.has(k)).map(
    (k) => BULK_REG_COLUMNS.find((c) => c.key === k)?.label ?? k
  );
  return { keys, missingColumns };
}

function buildRow(rec: Record<string, string>, rowNumber: number): ParsedParticipantRow | RejectedRow {
  const get = (k: string) => (rec[k] ?? "").trim();
  const missing = REQUIRED.filter((k) => !get(k));
  if (missing.length) {
    const labels = missing.map((k) => BULK_REG_COLUMNS.find((c) => c.key === k)?.label ?? k);
    return { rowNumber, reason: `Missing required field(s): ${labels.join(", ")}` };
  }
  if (!truthy(get("guardianConsent"))) {
    return { rowNumber, reason: "Guardian consent must be 'yes' — a minor cannot be registered without parental/guardian consent." };
  }
  const dob = new Date(get("dateOfBirth"));
  if (isNaN(dob.getTime())) {
    return { rowNumber, reason: `Invalid date of birth "${get("dateOfBirth")}" (use YYYY-MM-DD).` };
  }
  if (dob.getTime() > Date.now()) {
    return { rowNumber, reason: "Date of birth is in the future." };
  }
  return {
    fullName: get("fullName"),
    dateOfBirth: dob,
    classLevel: get("classLevel") || null,
    guardianName: get("guardianName"),
    mediaReleaseGranted: truthy(get("mediaRelease")),
    address: get("address") || null,
  };
}

export async function parseBulkRegistration(buffer: Buffer, filename: string): Promise<ParsedBulkRegistration> {
  const records: Record<string, string>[] = [];
  let missingColumns: string[] = [];

  if (/\.csv$/i.test(filename)) {
    const parsed = Papa.parse<string[]>(buffer.toString("utf8"), { skipEmptyLines: true });
    const matrix = parsed.data as unknown as string[][];
    if (!matrix.length) return { rows: [], rejected: [], missingColumns: REQUIRED };
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
    if (!ws) return { rows: [], rejected: [], missingColumns: REQUIRED };
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

  const rows: ParsedParticipantRow[] = [];
  const rejected: RejectedRow[] = [];
  records.forEach((rec, i) => {
    if (!Object.values(rec).some((v) => (v ?? "").trim())) return; // skip empty rows
    const result = buildRow(rec, i + 2);
    if ("reason" in result) rejected.push(result as RejectedRow);
    else rows.push(result as ParsedParticipantRow);
  });

  return { rows, rejected, missingColumns: [] };
}
