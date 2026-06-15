import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getAdminFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  "referenceId",
  "createdAt",
  "status",
  "companyName",
  "rcNumber",
  "turnoverBand",
  "banks",
  "contactName",
  "contactTitle",
  "contactEmail",
  "contactPhone",
  "registeredAddress",
  "representativeIdType",
  "hasActiveOrPendingFacility",
  "hasPriorBankDispute",
  "assignedTeam",
  "referralCode",
];

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "pii.export");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const status = req.nextUrl.searchParams.get("status")?.trim();
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const rows = await db.recoveryComplaint.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.referenceId,
        r.createdAt.toISOString(),
        r.status,
        r.companyName,
        r.rcNumber,
        r.turnoverBand,
        r.banks.join("|"),
        r.contactName,
        r.contactTitle,
        r.contactEmail,
        r.contactPhone,
        [r.regAddressLine1, r.regAddressLine2, r.regAddressCity, r.regAddressState, r.regAddressCountry, r.regAddressPostalCode]
          .filter(Boolean)
          .join(", "),
        r.representativeIdType ?? "",
        r.hasActiveOrPendingFacility == null ? "" : r.hasActiveOrPendingFacility ? "yes" : "no",
        r.hasPriorBankDispute == null ? "" : r.hasPriorBankDispute ? "yes" : "no",
        r.assignedTeam ?? "",
        r.referralCode ?? "",
      ].map(csvEscape).join(",")
    );
  }
  const csv = lines.join("\n");

  const admin = await getAdminFromRequest(req);
  await recordAudit({
    action: "complaints_export",
    actorLabel: admin?.email ?? "admin",
    metadata: { count: rows.length, status, from, to },
  });

  const filename = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
