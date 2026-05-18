import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeCode(name: string): string {
  const slug = (name.split(" ")[0] ?? "ref").toLowerCase().replace(/[^a-z]/g, "").slice(0, 8) || "ref";
  const rand = Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");
  return `${slug}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email } = (await req.json()) as { name?: string; email?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Referrals are temporarily unavailable." }, { status: 503 });
    }

    // Retry on the (vanishingly rare) chance of a code collision
    let code = makeCode(name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.referral.findUnique({ where: { code } });
      if (!existing) break;
      code = makeCode(name);
    }

    await db.referral.create({
      data: { code, referrerName: name.trim(), referrerEmail: email.trim() },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";
    return NextResponse.json({
      code,
      url: `${base}/recovery?ref=${code}`,
    });
  } catch (err) {
    console.error("[/api/refer]", err);
    return NextResponse.json({ error: "Failed to generate referral link." }, { status: 500 });
  }
}
