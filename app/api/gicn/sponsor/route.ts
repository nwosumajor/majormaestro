import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getClientUserFromRequest } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { sendSponsorshipConfirmation } from "@/lib/email";
import { initiateSponsorshipPayment, newSponsorshipReference } from "@/lib/payments";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shape returned to the client; the form redirects on `redirectUrl`. */
function paymentPayload(p: { reference: string | null; providerRef?: string | null; redirectUrl: string | null; configured: boolean }) {
  return { reference: p.reference, providerRef: p.providerRef ?? null, redirectUrl: p.redirectUrl, configured: p.configured };
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`gicn-sponsor:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(rl) });
  }
  if (!db) return NextResponse.json({ error: "Sponsorship is temporarily unavailable." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    sponsorName?: string; sponsorEmail?: string; amountNgn?: number; programId?: string; idempotencyKey?: string;
  };
  const sponsorName = (body.sponsorName ?? "").trim();
  const sponsorEmail = (body.sponsorEmail ?? "").trim();
  const amountNgn = Number(body.amountNgn);
  if (!sponsorName) return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  if (!EMAIL_RE.test(sponsorEmail)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) return NextResponse.json({ error: "Enter a valid sponsorship amount." }, { status: 400 });

  // Idempotency key dedupes double-submits and network retries. Trust a
  // well-formed client key; otherwise mint one (no cross-request dedupe, but safe).
  const rawKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const idempotencyKey = rawKey.length >= 8 && rawKey.length <= 200 ? rawKey : `srv-${randomUUID()}`;

  const headers = rateLimitHeaders(rl);

  // ── Fast path: an identical submit already exists for this key ──────────────
  const existing = await db.sponsorship.findUnique({
    where: { idempotencyKey },
    select: { id: true, status: true, reference: true, providerRef: true, authorizationUrl: true },
  });
  if (existing) {
    if (existing.status === "paid") {
      // Already settled — never re-charge; send the user to the completed view.
      return NextResponse.json(
        { success: true, alreadyPaid: true, redirect: `/gicn/sponsor/complete?reference=${encodeURIComponent(existing.reference ?? "")}` },
        { headers }
      );
    }
    if (existing.status === "pending" && existing.authorizationUrl) {
      // Same checkout already initialised — reuse it (no new transaction).
      return NextResponse.json(
        { success: true, sponsorshipId: existing.id, payment: paymentPayload({ reference: existing.reference, providerRef: existing.providerRef, redirectUrl: existing.authorizationUrl, configured: true }) },
        { headers }
      );
    }
    // pending but checkout not yet initialised (prior attempt failed) → fall through and (re)initialise on the SAME row + reference.
  }

  // Validate optional program earmark
  let programId: string | null = null;
  let programTitle: string | null = null;
  if (typeof body.programId === "string" && body.programId) {
    const p = await db.program.findUnique({ where: { id: body.programId }, select: { id: true, title: true } });
    if (p) { programId = p.id; programTitle = p.title; }
  }

  const user = await getClientUserFromRequest(req); // optional — sponsor may be a guest
  const amountKobo = BigInt(Math.round(amountNgn * 100));

  // Resolve the row + reference. Reference is generated and stored BEFORE calling
  // Paystack so the webhook/callback can always find it, and so a retry reuses the
  // same reference (Paystack treats a reference as idempotent → no double charge).
  let rowId = existing?.id ?? null;
  let reference = existing?.reference ?? null;

  if (!rowId) {
    reference = newSponsorshipReference();
    try {
      const created = await db.sponsorship.create({
        data: { sponsorUserId: user?.id ?? null, sponsorName, sponsorEmail, amountKobo, programId, status: "pending", idempotencyKey, reference },
        select: { id: true },
      });
      rowId = created.id;
    } catch (e: unknown) {
      // Concurrent double-submit lost the unique race on idempotencyKey — re-read the winner.
      if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
        const winner = await db.sponsorship.findUnique({
          where: { idempotencyKey },
          select: { id: true, reference: true, providerRef: true, authorizationUrl: true },
        });
        if (winner?.authorizationUrl) {
          return NextResponse.json(
            { success: true, sponsorshipId: winner.id, payment: paymentPayload({ reference: winner.reference, providerRef: winner.providerRef, redirectUrl: winner.authorizationUrl, configured: true }) },
            { headers }
          );
        }
        rowId = winner?.id ?? null;
        reference = winner?.reference ?? reference;
      } else {
        throw e;
      }
    }
  }

  if (!rowId || !reference) {
    return NextResponse.json({ error: "We couldn't start the payment. Please try again." }, { status: 500, headers });
  }

  // Initialise (or re-initialise with the same reference) the Paystack checkout.
  let payment;
  try {
    payment = await initiateSponsorshipPayment({ reference, sponsorshipId: rowId, amountKobo, sponsorEmail, sponsorName });
  } catch (e) {
    console.error("[gicn-sponsor] payment init failed:", e);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again." }, { status: 502, headers });
  }

  await db.sponsorship.update({
    where: { id: rowId },
    data: { reference: payment.reference, providerRef: payment.providerRef, authorizationUrl: payment.redirectUrl },
  });

  await recordAudit({
    action: "gicn_sponsorship_create",
    actorLabel: user?.email ?? sponsorEmail,
    targetType: "Sponsorship",
    targetId: rowId,
    metadata: { amountKobo: amountKobo.toString(), programId, reference: payment.reference, configured: payment.configured },
  });

  // Configured gateway → confirmation email is sent on the verified charge.success
  // (webhook/callback). Stub mode → keep the legacy "pending" acknowledgement.
  if (!payment.configured) {
    after(() =>
      sendSponsorshipConfirmation({ sponsorEmail, sponsorName, amountKobo, programTitle }).catch((e) =>
        console.error("[gicn-sponsor] confirmation email error:", e)
      )
    );
  }

  return NextResponse.json({ success: true, sponsorshipId: rowId, payment: paymentPayload(payment) }, { headers });
}
