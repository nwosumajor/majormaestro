import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { isValidEmail, validatePhone } from "@/lib/validation";
import { sendOtpCode } from "@/lib/email";
import { smsConfigured, sendSms } from "@/lib/sms";
import {
  isOtpChannel,
  generateOtpCode,
  hashOtp,
  normalizeOtpTarget,
  OTP_TTL_MS,
  type OtpChannel,
} from "@/lib/otp";

// Issue a contact-verification OTP for the recovery intake. Public + rate-limited
// (per IP and per target) like the magic-link start route.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipRl = rateLimit(`otp-ip:${ip}`, 5, 60 * 60);
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: "Too many verification requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(ipRl) }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { channel?: string; target?: string };
  if (!isOtpChannel(body.channel)) {
    return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
  }
  const channel: OtpChannel = body.channel;

  // Validate + normalize the target per channel.
  let target: string;
  if (channel === "email") {
    if (!isValidEmail(body.target)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 422 });
    }
    target = normalizeOtpTarget("email", body.target!);
  } else {
    const phone = validatePhone(body.target);
    if (!phone.ok) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 422 });
    }
    target = normalizeOtpTarget("sms", phone.e164!);
  }

  // SMS degrades gracefully when no provider is configured.
  if (channel === "sms" && !smsConfigured()) {
    return NextResponse.json(
      { ok: false, channelUnavailable: true, message: "SMS verification is not currently available." },
      { status: 200 }
    );
  }

  const targetRl = rateLimit(`otp-target:${channel}:${target}`, 3, 60 * 60);
  if (!targetRl.ok) {
    return NextResponse.json(
      { error: "Too many codes requested for this contact. Please try again later." },
      { status: 429, headers: rateLimitHeaders(targetRl) }
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  if (db) {
    try {
      await db.otpChallenge.create({
        data: { channel, target, codeHash: hashOtp(code), expiresAt },
      });
    } catch (err) {
      console.error("[otp/start] DB error:", err);
      return NextResponse.json({ error: "Could not start verification. Please try again." }, { status: 500 });
    }
  }

  // Deliver after the response so the client isn't blocked on send latency.
  after(async () => {
    try {
      if (channel === "email") await sendOtpCode(target, code);
      else await sendSms(target, `Your MajorGBN verification code is ${code}. It expires in 10 minutes.`);
    } catch (err) {
      console.error("[otp/start] send error:", err);
    }
  });

  return NextResponse.json({ ok: true });
}
