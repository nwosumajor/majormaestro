import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { sendSponsorshipConfirmation } from "@/lib/email";
import { initiateSponsorshipPayment } from "@/lib/payments";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`gicn-sponsor:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });
  }
  if (!db) return NextResponse.json({ error: "Sponsorship is temporarily unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    sponsorName?: string; sponsorEmail?: string; amountNgn?: number; programId?: string;
  };
  const sponsorName = (body.sponsorName ?? "").trim();
  const sponsorEmail = (body.sponsorEmail ?? "").trim();
  const amountNgn = Number(body.amountNgn);
  if (!sponsorName) return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  if (!EMAIL_RE.test(sponsorEmail)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) return NextResponse.json({ error: "Enter a valid sponsorship amount." }, { status: 400 });

  // Validate optional program earmark
  let programId: string | null = null;
  let programTitle: string | null = null;
  if (typeof body.programId === "string" && body.programId) {
    const p = await db.program.findUnique({ where: { id: body.programId }, select: { id: true, title: true } });
    if (p) { programId = p.id; programTitle = p.title; }
  }

  const user = await getClientUserFromRequest(req); // optional — sponsor may be a guest
  const amountKobo = BigInt(Math.round(amountNgn * 100));

  const sponsorship = await db.sponsorship.create({
    data: { sponsorUserId: user?.id ?? null, sponsorName, sponsorEmail, amountKobo, programId, status: "pending" },
    select: { id: true },
  });

  const payment = await initiateSponsorshipPayment({ sponsorshipId: sponsorship.id, amountKobo, sponsorEmail, sponsorName });

  await recordAudit({
    action: "gicn_sponsorship_create",
    actorLabel: user?.email ?? sponsorEmail,
    targetType: "Sponsorship",
    targetId: sponsorship.id,
    metadata: { amountKobo: amountKobo.toString(), programId },
  });

  after(() =>
    sendSponsorshipConfirmation({ sponsorEmail, sponsorName, amountKobo, programTitle }).catch((e) =>
      console.error("[gicn-sponsor] confirmation email error:", e)
    )
  );

  return NextResponse.json({ success: true, sponsorshipId: sponsorship.id, payment }, { headers: rateLimitHeaders(rl) });
}
