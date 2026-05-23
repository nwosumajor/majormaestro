/**
 * Copies all UploadedDocument rows currently on "local" backend up to S3,
 * then updates the row's storageBackend column. Idempotent — already-S3 rows
 * are skipped. The local source file is left in place; delete it manually
 * after you've verified downloads work end-to-end against S3.
 *
 * Usage:
 *   node scripts/migrate-uploads-to-s3.mjs            # execute
 *   node scripts/migrate-uploads-to-s3.mjs --dry-run  # report only
 *
 * Required env (in addition to DATABASE_URL):
 *   STORAGE_BACKEND=s3
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_ENDPOINT (optional, for R2/MinIO)
 */

import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const dryRun = process.argv.includes("--dry-run");
const LOCAL_DIR = path.join(process.cwd(), "uploads");

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");
  if (process.env.STORAGE_BACKEND !== "s3") {
    fail(`STORAGE_BACKEND must be 's3' for this migration (got: ${process.env.STORAGE_BACKEND ?? "<unset>"}).`);
  }
  for (const k of ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
    if (!process.env[k]) fail(`${k} is not set.`);
  }

  const db = new PrismaClient();
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
  const Bucket = process.env.S3_BUCKET;

  const docs = await db.uploadedDocument.findMany({
    where: { storageBackend: "local" },
    select: { id: true, storedAs: true, fileName: true, mimeType: true, complaintId: true },
  });

  if (docs.length === 0) {
    console.log("No local-backend documents to migrate. Nothing to do.");
    await db.$disconnect();
    return;
  }

  console.log(`Found ${docs.length} local document(s). ${dryRun ? "[DRY RUN]" : "[EXECUTE]"}`);
  console.log(`Source: ${LOCAL_DIR}`);
  console.log(`Target bucket: ${Bucket}${process.env.S3_ENDPOINT ? ` (endpoint: ${process.env.S3_ENDPOINT})` : ""}\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const localPath = path.join(LOCAL_DIR, doc.storedAs);
    try {
      let alreadyInS3 = false;
      try {
        await s3.send(new HeadObjectCommand({ Bucket, Key: doc.storedAs }));
        alreadyInS3 = true;
      } catch {
        /* expected — key missing → upload */
      }

      if (!alreadyInS3) {
        const bytes = await readFile(localPath);
        if (!dryRun) {
          await s3.send(new PutObjectCommand({
            Bucket,
            Key: doc.storedAs,
            Body: bytes,
            ContentType: doc.mimeType || "application/octet-stream",
            ServerSideEncryption: "AES256",
            Metadata: { originalName: doc.fileName },
          }));
        }
        console.log(`  ↑ ${doc.storedAs} (${doc.fileName}, ${bytes.length}B)`);
      } else {
        console.log(`  = ${doc.storedAs} already in S3`);
        skipped++;
      }

      if (!dryRun) {
        await db.uploadedDocument.update({
          where: { id: doc.id },
          data: { storageBackend: "s3" },
        });
      }
      migrated++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${doc.storedAs}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await db.$disconnect();
  console.log(`\nDone. migrated=${migrated} skipped-already-in-s3=${skipped} failed=${failed} dry-run=${dryRun}`);
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
