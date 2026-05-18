import { authenticator } from "otplib";
import QRCode from "qrcode";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

// 30s windows, allow ±1 step of clock drift
authenticator.options = { window: 1, step: 30 };

const ISSUER = "MajorGBN Admin";

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
  return authenticator.generateSecret();
}

export function otpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export async function qrDataUrl(email: string, secret: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl(email, secret));
}

export function verifyCode(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ token: code.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}
