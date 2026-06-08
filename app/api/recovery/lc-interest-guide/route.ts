import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { sendLcInterestGuide } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lead-magnet-style opt-in for the Letters of Credit collateral-interest campaign.
// Single recipient (the person who opted in) — never a blast — so it can't harm
// sender reputation. Mirrors /api/lead-magnet (rate-limited, upsert, after()).
export async function POST(req: NextRequest) {
  const rl = rateLimit(`lc-interest-guide:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const body = (await req.json()) as {
      email?: string;
      companyName?: string;
      coverNaira?: number;
      months?: number;
      mpr?: number;
    };
    const email = (body.email ?? "").trim();
    const companyName = body.companyName?.trim() || undefined;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    // Sanitise the optional estimator context (recomputed server-side in the email).
    const coverNaira = Number.isFinite(body.coverNaira) && (body.coverNaira as number) > 0 ? (body.coverNaira as number) : undefined;
    const months = Number.isFinite(body.months) && (body.months as number) > 0 ? (body.months as number) : undefined;
    const mpr = Number.isFinite(body.mpr) && (body.mpr as number) > 0 ? (body.mpr as number) : undefined;

    if (db) {
      try {
        await db.leadMagnetSubscriber.upsert({
          where: { email },
          update: { companyName },
          create: { email, companyName },
        });
      } catch (dbErr) {
        console.error("[lc-interest-guide] DB error (non-fatal):", dbErr);
      }
    }

    after(() =>
      sendLcInterestGuide(email, { companyName, coverNaira, months, mpr }).catch((err) =>
        console.error("[lc-interest-guide] Email error (non-fatal):", err)
      )
    );

    return NextResponse.json({
      success: true,
      message: "Your LC recovery guide is on its way. Check your inbox within the next few minutes.",
    });
  } catch (err) {
    console.error("[/api/recovery/lc-interest-guide]", err);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
