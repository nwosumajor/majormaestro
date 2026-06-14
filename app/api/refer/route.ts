import { NextRequest, NextResponse, after } from "next/server";
import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { sendReferralVerification } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validation";


function makeCode(name: string): string {
  const slug = (name.split(" ")[0] ?? "ref").toLowerCase().replace(/[^a-z]/g, "").slice(0, 8) || "ref";
  const rand = Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");
  return `${slug}-${rand}`;
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`refer:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many referral requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const { name, email } = (await req.json()) as { name?: string; email?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Referrals are temporarily unavailable." }, { status: 503 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";
    const normEmail = email.trim().toLowerCase();

    // One code per email — return the existing one rather than minting duplicates.
    const existingByEmail = await db.referral.findFirst({
      where: { referrerEmail: { equals: normEmail, mode: "insensitive" } },
      select: { code: true },
    });
    if (existingByEmail) {
      return NextResponse.json({ code: existingByEmail.code, url: `${base}/recovery?ref=${existingByEmail.code}`, existing: true });
    }

    // Retry on the (vanishingly rare) chance of a code collision
    let code = makeCode(name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.referral.findUnique({ where: { code } });
      if (!existing) break;
      code = makeCode(name);
    }

    const verifyToken = randomBytes(24).toString("base64url");
    const verificationTokenHash = createHash("sha256").update(verifyToken).digest("hex");
    await db.referral.create({
      data: { code, referrerName: name.trim(), referrerEmail: normEmail, verificationTokenHash },
    });

    const shareUrl = `${base}/recovery?ref=${code}`;
    const verifyUrl = `${base}/api/refer/verify?token=${verifyToken}`;
    // Email is usable immediately; verification just unlocks payout eligibility.
    after(() =>
      sendReferralVerification(normEmail, name.trim(), verifyUrl, shareUrl).catch((e) =>
        console.error("[refer] verification email error:", e)
      )
    );

    return NextResponse.json({ code, url: shareUrl });
  } catch (err) {
    console.error("[/api/refer]", err);
    return NextResponse.json({ error: "Failed to generate referral link." }, { status: 500 });
  }
}
