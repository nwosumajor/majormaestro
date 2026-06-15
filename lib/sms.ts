// Pluggable SMS provider. Mirrors how Paystack/S3 degrade gracefully when
// unconfigured: with no provider env set, sendSms is a logged no-op (stub) so
// the OTP flow never hard-fails. Wire a real provider (e.g. Termii) behind
// smsConfigured() when ready — the rest of the app needs no changes.

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);
}

export interface SmsResult {
  sent: boolean;
  stub?: boolean;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) {
    // Stub: no provider configured. Log so it's observable in dev without sending.
    console.log(`[sms] (stub — no provider configured) → ${to}: ${body}`);
    return { sent: false, stub: true };
  }
  // A real provider integration goes here, dispatched on SMS_PROVIDER. Until one
  // is wired + tested, behave as a stub so phone OTP degrades gracefully rather
  // than throwing in production.
  console.warn(`[sms] SMS_PROVIDER="${process.env.SMS_PROVIDER}" set but no client wired; treating as stub.`);
  return { sent: false, stub: true };
}
