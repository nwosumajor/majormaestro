import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getClientUserFromRequest } from "@/lib/auth";
import { TEMPLATE_COLUMNS } from "@/lib/classificationSchema";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(req: NextRequest) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "MajorGBN";
  const ws = wb.addWorksheet("Staff");
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.label, key: c.key, width: 32 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };

  // One illustrative example row so HR sees the expected granularity.
  ws.addRow({
    staffName: "Jane Doe",
    staffRef: "jane.doe@company.com",
    psychological: "Analytical, detail-oriented, calm under pressure, risk-aware",
    mental: "Strong quantitative reasoning, fast learner, structured problem-solver",
    social: "Clear communicator, collaborative, comfortable presenting to leadership",
    environmental: "Thrives in structured environments, adaptable to hybrid work",
    certificates: "ACCA, CFA Level 1, Advanced Excel",
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": 'attachment; filename="majorgbn-bulk-classification-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
