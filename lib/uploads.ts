import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type StorageBackend = "local" | "s3";

interface PutResult {
  key: string;
  backend: StorageBackend;
}

interface PutInput {
  bytes: Buffer;
  fileExt: string;
  contentType: string;
}

const LOCAL_DIR = path.join(process.cwd(), "uploads");
const SAFE_KEY = /^[A-Za-z0-9._-]+$/;

/** Allowed upload extensions — authoritative (MIME is client-supplied/spoofable). */
export const ALLOWED_UPLOAD_EXTS = new Set([".pdf", ".xls", ".xlsx", ".csv"]);

/**
 * Validate an upload by its file EXTENSION. The extension is the authoritative
 * signal: MIME types are client-controlled and easily spoofed (e.g. sending
 * `application/octet-stream` for an executable), so they must never be sufficient
 * on their own to admit a file.
 */
export function isAllowedUpload(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_UPLOAD_EXTS.has(ext);
}

function getBackend(): StorageBackend {
  const b = process.env.STORAGE_BACKEND?.toLowerCase();
  if (b === "s3") return "s3";
  return "local";
}

function generateKey(fileExt: string): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${fileExt}`;
}

// ─── S3 client (lazy) ─────────────────────────────────────────────────────

type S3Module = typeof import("@aws-sdk/client-s3");
let s3Module: S3Module | null = null;
let s3Client: InstanceType<S3Module["S3Client"]> | null = null;

async function getS3() {
  if (!s3Module) {
    s3Module = await import("@aws-sdk/client-s3");
  }
  if (!s3Client) {
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error("S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY are required when STORAGE_BACKEND=s3.");
    }
    s3Client = new s3Module.S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: !!process.env.S3_ENDPOINT,
    });
  }
  return { mod: s3Module, client: s3Client };
}

function s3Bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET env var is required when STORAGE_BACKEND=s3.");
  return b;
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function putObject(input: PutInput): Promise<PutResult> {
  const backend = getBackend();
  const key = generateKey(input.fileExt);

  if (backend === "s3") {
    const { mod, client } = await getS3();
    await client.send(new mod.PutObjectCommand({
      Bucket: s3Bucket(),
      Key: key,
      Body: input.bytes,
      ContentType: input.contentType,
      ServerSideEncryption: "AES256",
    }));
    return { key, backend: "s3" };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, key), input.bytes);
  return { key, backend: "local" };
}

export async function getObject(key: string, backend: StorageBackend): Promise<Buffer> {
  if (!SAFE_KEY.test(key)) {
    throw new Error("Invalid storage key.");
  }

  if (backend === "s3") {
    const { mod, client } = await getS3();
    const res = await client.send(new mod.GetObjectCommand({
      Bucket: s3Bucket(),
      Key: key,
    }));
    const stream = res.Body;
    if (!stream) throw new Error("Empty S3 response body.");
    const chunks: Buffer[] = [];
    // @ts-expect-error AsyncIterable<Uint8Array> at runtime
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  return readFile(path.join(LOCAL_DIR, key));
}

export async function deleteObject(key: string, backend: StorageBackend): Promise<void> {
  if (!SAFE_KEY.test(key)) return;

  if (backend === "s3") {
    const { mod, client } = await getS3();
    await client.send(new mod.DeleteObjectCommand({
      Bucket: s3Bucket(),
      Key: key,
    }));
    return;
  }

  const { unlink } = await import("fs/promises");
  await unlink(path.join(LOCAL_DIR, key)).catch(() => undefined);
}

export function describeStorage(): { backend: StorageBackend; bucket?: string } {
  const backend = getBackend();
  if (backend === "s3") return { backend, bucket: process.env.S3_BUCKET };
  return { backend };
}
