import { generateSecret as gen, generateURI, verifySync } from "otplib";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ISSUER = "MajorGBN Admin";
const TIME_TOLERANCE_SECONDS = 30; // accept ±1 30-second window

function getEncryptionKey(): Buffer {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET required (used to derive TOTP encryption key).");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted TOTP secret.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const data = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return data.toString("utf8");
}

export function generateSecret(): string {
  return gen({ length: 20 });
}

export function otpauthUrl(email: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export async function qrDataUrl(email: string, secret: string): Promise<string> {
  // Lazy-import qrcode so it doesn't get pulled into bundles that never render the setup screen.
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(otpauthUrl(email, secret));
}

export function verifyCode(secret: string, code: string): boolean {
  try {
    const result = verifySync({
      strategy: "totp",
      secret,
      token: code.replace(/\s/g, ""),
      epochTolerance: TIME_TOLERANCE_SECONDS,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}
