import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface ResultItem {
  rank: number;
  departmentName: string;
  industryCategory: string;
  confidence: number;
  reasoning: string;
}

const EXPORT_COLUMNS = [
  { key: "staffName", header: "Staff Name" },
  { key: "staffRef", header: "Staff Ref" },
  { key: "rank", header: "Rank" },
  { key: "departmentName", header: "Department" },
  { key: "industryCategory", header: "Industry" },
  { key: "confidence", header: "Confidence" },
  { key: "reasoning", header: "Reasoning" },
  { key: "rowStatus", header: "Status" },
];

// GET ?format=csv|xlsx (default xlsx) — one row per (staff × ranked placement).
export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { batchId } = await params;
  const batch = await db.classificationBatch.findFirst({
    where: { id: batchId, userId: user.id },
    select: {
      label: true,
      classifications: {
        orderBy: { createdAt: "asc" },
        select: { staffName: true, staffRef: true, status: true, results: true, error: true },
      },
    },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });

  const flat: Record<string, string | number>[] = [];
  for (const c of batch.classifications) {
    const results = Array.isArray(c.results) ? (c.results as unknown as ResultItem[]) : [];
    if (c.status !== "complete" || results.length === 0) {
      flat.push({
        staffName: c.staffName,
        staffRef: c.staffRef ?? "",
        rank: "",
        departmentName: "",
        industryCategory: "",
        confidence: "",
        reasoning: c.error ?? "",
        rowStatus: c.status,
      });
      continue;
    }
    for (const r of results) {
      flat.push({
        staffName: c.staffName,
        staffRef: c.staffRef ?? "",
        rank: r.rank,
        departmentName: r.departmentName,
        industryCategory: r.industryCategory,
        confidence: r.confidence,
        reasoning: r.reasoning,
        rowStatus: c.status,
      });
    }
  }

  const format = new URL(req.url).searchParams.get("format");
  const base = `classification-results-${batchId.slice(0, 8)}`;

  if (format === "csv") {
    const csv = Papa.unparse({ fields: EXPORT_COLUMNS.map((c) => c.header), data: flat.map((r) => EXPORT_COLUMNS.map((c) => r[c.key] ?? "")) });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "MajorGBN";
  const ws = wb.addWorksheet("Results");
  ws.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.key === "reasoning" ? 60 : 22 }));
  ws.getRow(1).font = { bold: true };
  flat.forEach((r) => ws.addRow(r));

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
