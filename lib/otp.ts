import { createHash, randomInt } from "crypto";

// One-time-passcode primitives for recovery-intake contact verification.
// DB interaction lives in the start/verify routes (mirrors the magic-link flow);
// this module holds the pure, testable bits.

export type OtpChannel = "email" | "sms";

export const OTP_TTL_MS = 10 * 60 * 1000; // code validity
export const OTP_MAX_ATTEMPTS = 5; // wrong guesses per challenge before it's dead
export const OTP_VERIFIED_WINDOW_MS = 30 * 60 * 1000; // how long a verified target stays "verified" at submit time

export function isOtpChannel(v: unknown): v is OtpChannel {
  return v === "email" || v === "sms";
}

export function generateOtpCode(): string {
  // 6-digit, zero-padded, cryptographically random.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Hash codes at rest, peppered with the app signing secret so a DB leak alone
// can't trivially precompute the 10^6 possible hashes.
export function hashOtp(code: string): string {
  const pepper = process.env.ADMIN_SESSION_SECRET ?? "";
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}

// Canonical target: lowercased email, or the phone as given (already E.164 by
// the time the start route validates it).
export function normalizeOtpTarget(channel: OtpChannel, target: string): string {
  return channel === "email" ? target.trim().toLowerCase() : target.trim();
}
