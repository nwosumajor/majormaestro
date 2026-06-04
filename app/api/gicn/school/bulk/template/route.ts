import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getClientUserFromRequest } from "@/lib/auth";
import { BULK_REG_COLUMNS } from "@/lib/gicnRegistrationSchema";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(req: NextRequest) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "GICN";
  const ws = wb.addWorksheet("Students");
  ws.columns = BULK_REG_COLUMNS.map((c) => ({ header: c.label, key: c.key, width: 30 }));
  ws.getRow(1).font = { bold: true };
  ws.addRow({
    fullName: "Jane Doe",
    dateOfBirth: "2012-05-14",
    classLevel: "JSS 2",
    guardianName: "Mr. & Mrs. Doe",
    guardianConsent: "yes",
    mediaRelease: "no",
    address: "12 Main Street, Lagos",
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": 'attachment; filename="gicn-bulk-registration-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
