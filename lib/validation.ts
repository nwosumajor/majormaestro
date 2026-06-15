import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

// ---------------------------------------------------------------------------
// Central contact-data validators. Replaces the EMAIL_RE regex that was
// duplicated across several API routes, and adds robust phone validation via
// libphonenumber-js (used instead of a brittle regex). Server-side callers are
// the authoritative gate; the intake form mirrors these for inline UX errors.
// ---------------------------------------------------------------------------

// Pragmatic format check — not a deliverability guarantee (that's what OTP is
// for). Bounded length guards against pathological inputs.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

export interface PhoneValidation {
  ok: boolean;
  /** E.164-normalized number (e.g. "+2348031234567") when ok. */
  e164?: string;
}

// Validate and normalize a phone number to E.164. Defaults to Nigeria so a
// customer can type a local number (0803…) without the +234 prefix; an explicit
// international prefix (+44…) is honored regardless of the default.
export function validatePhone(
  input: string | null | undefined,
  defaultCountry: CountryCode = "NG"
): PhoneValidation {
  if (!input) return { ok: false };
  const raw = input.trim();
  if (!raw) return { ok: false };
  try {
    const parsed = parsePhoneNumberFromString(raw, defaultCountry);
    if (parsed && parsed.isValid()) return { ok: true, e164: parsed.number };
  } catch {
    /* fall through to invalid */
  }
  return { ok: false };
}
