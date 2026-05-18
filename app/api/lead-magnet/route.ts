import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendLeadMagnetGuide } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`lead-magnet:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const { email, companyName } = (await req.json()) as {
      email: string;
      companyName?: string;
    };

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    // Persist subscriber (upsert — re-subscribes silently)
    if (db) {
      try {
        await db.leadMagnetSubscriber.upsert({
          where: { email },
          update: { companyName: companyName ?? undefined },
          create: { email, companyName: companyName ?? undefined },
        });
      } catch (dbErr) {
        console.error("[lead-magnet] DB error (non-fatal):", dbErr);
      }
    }

    // Send guide email (fire-and-forget — don't fail request if email bounces)
    sendLeadMagnetGuide(email, companyName).catch((err) =>
      console.error("[lead-magnet] Email error (non-fatal):", err)
    );

    return NextResponse.json({
      success: true,
      message: "Your guide is on its way. Check your inbox within the next few minutes.",
    });
  } catch (err) {
    console.error("[/api/lead-magnet]", err);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
