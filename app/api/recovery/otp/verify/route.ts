import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { validatePhone } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import {
  isOtpChannel,
  hashOtp,
  normalizeOtpTarget,
  OTP_MAX_ATTEMPTS,
  type OtpChannel,
} from "@/lib/otp";

// Verify a contact-verification OTP. Server-side only. Per-challenge attempt cap
// plus a per-IP rate limit guard against brute force.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`otp-verify:${ip}`, 20, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { channel?: string; target?: string; code?: string };
  if (!isOtpChannel(body.channel) || !body.target || !body.code) {
    return NextResponse.json({ error: "channel, target and code are required." }, { status: 400 });
  }
  const channel: OtpChannel = body.channel;
  const target =
    channel === "email"
      ? normalizeOtpTarget("email", body.target)
      : normalizeOtpTarget("sms", validatePhone(body.target).e164 ?? body.target);

  // Newest live (unconsumed, unexpired) challenge for this target.
  const challenge = await db.otpChallenge.findFirst({
    where: { channel, target, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) {
    return NextResponse.json({ ok: false, error: "Code expired. Please request a new one." }, { status: 400 });
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "Too many incorrect attempts. Please request a new code." }, { status: 400 });
  }

  if (hashOtp(body.code.trim()) !== challenge.codeHash) {
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ ok: false, error: "Incorrect code." }, { status: 400 });
  }

  await db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
  await recordAudit({
    action: "recovery_otp_verified",
    actorLabel: target,
    targetType: "OtpChallenge",
    targetId: challenge.id,
    metadata: { channel },
  });

  return NextResponse.json({ ok: true });
}
