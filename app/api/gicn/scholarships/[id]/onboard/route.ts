import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { encryptSecret } from "@/lib/totp";
import { applyScholarshipDecision } from "@/lib/scholarshipDecide";

// Guardian completes onboarding for an AWARDED scholarship: provides payout
// details (bank + account) and NIN (ENCRYPTED at rest) and accepts the
// conditions, then submits for board verification. Ownership-enforced.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getClientUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { id } = await ctx.params;

  const award = await db.scholarshipAward.findFirst({ where: { id, participant: { ownerUserId: user.id } }, select: { id: true, status: true } });
  if (!award) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (award.status !== "awarded") return NextResponse.json({ error: "Onboarding is only available once the scholarship has been awarded." }, { status: 409 });

  const b = (await req.json().catch(() => ({}))) as { bankName?: string; accountNumber?: string; nin?: string; acceptConditions?: boolean };
  if (b.acceptConditions !== true) return NextResponse.json({ error: "You must accept the scholarship conditions to continue." }, { status: 400 });

  const nin = String(b.nin ?? "").replace(/\s/g, "");
  const acct = String(b.accountNumber ?? "").replace(/\s/g, "");
  const bankName = String(b.bankName ?? "").trim();
  if (!/^\d{11}$/.test(nin)) return NextResponse.json({ error: "NIN must be 11 digits." }, { status: 400 });
  if (!/^\d{10}$/.test(acct)) return NextResponse.json({ error: "Account number must be a 10-digit NUBAN." }, { status: 400 });
  if (!bankName) return NextResponse.json({ error: "Bank name is required." }, { status: 400 });

  await db.scholarshipAward.update({
    where: { id },
    data: { ninEncrypted: encryptSecret(nin), payoutAccountEncrypted: encryptSecret(acct), payoutAccountLast4: acct.slice(-4), payoutBankName: bankName },
  });

  // awarded → onboarding (board then verifies & activates). Audited + timelined.
  const result = await applyScholarshipDecision(id, "onboarding_submit", `guardian:${user.email}`, { note: "Onboarding submitted; conditions accepted." });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json({ ok: true, status: result.status });
}
