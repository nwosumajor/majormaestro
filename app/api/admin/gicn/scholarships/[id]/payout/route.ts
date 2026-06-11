import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { encryptSecret } from "@/lib/totp";

// Set payout details (NIN + bank) — admin, scholarship.disburse.
// NIN + full account number are stored ENCRYPTED at rest (AES-256-GCM). Only the
// bank name + last 4 digits are kept in clear (for display); the rest is reveal-gated.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req, "scholarship.disburse");
  if (gate.error) return gate.error;
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const b = (await req.json().catch(() => ({}))) as { bankName?: string; accountNumber?: string; nin?: string };
  const data: Record<string, unknown> = {};

  if (b.nin != null && String(b.nin).trim()) {
    const nin = String(b.nin).replace(/\s/g, "");
    if (!/^\d{11}$/.test(nin)) return NextResponse.json({ error: "NIN must be 11 digits." }, { status: 400 });
    data.ninEncrypted = encryptSecret(nin);
  }
  if (b.accountNumber != null && String(b.accountNumber).trim()) {
    const acct = String(b.accountNumber).replace(/\s/g, "");
    if (!/^\d{10}$/.test(acct)) return NextResponse.json({ error: "Account number must be a 10-digit NUBAN." }, { status: 400 });
    data.payoutAccountEncrypted = encryptSecret(acct);
    data.payoutAccountLast4 = acct.slice(-4);
  }
  if (b.bankName != null) data.payoutBankName = String(b.bankName).trim() || null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const award = await db.scholarshipAward.findUnique({ where: { id }, select: { id: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.scholarshipAward.update({ where: { id }, data });
  await recordAudit({
    action: "gicn_scholarship_payout_set",
    actorLabel: gate.admin.email,
    targetType: "ScholarshipAward",
    targetId: id,
    metadata: { ninProvided: "ninEncrypted" in data, accountProvided: "payoutAccountEncrypted" in data },
  });
  return NextResponse.json({ ok: true });
}
