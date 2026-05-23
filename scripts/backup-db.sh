#!/usr/bin/env bash
# Postgres backup → timestamped file → optional S3 upload.
#
# Usage:
#   bash scripts/backup-db.sh                                # writes to ./backups/
#   BACKUP_DIR=/var/backups bash scripts/backup-db.sh        # custom local dir
#   BACKUP_S3_BUCKET=gbn-backups bash scripts/backup-db.sh   # ALSO ship to S3
#
# Reads DATABASE_URL from env (sourced from .env.local if present).
# Supports any pg connection string (Supabase, Neon, RDS, self-hosted).
#
# Recommended cron (daily 03:30 UTC):
#   30 3 * * *  cd /app && bash scripts/backup-db.sh >> /var/log/gbn-backup.log 2>&1

set -euo pipefail

# Load .env.local if present and DATABASE_URL not already set
if [[ -z "${DATABASE_URL:-}" && -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "✗ DATABASE_URL not set." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "✗ pg_dump not installed. Install with: apt-get install postgresql-client (or brew install libpq)." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo host)"
FILENAME="ms2app-${HOSTNAME_SHORT}-${TIMESTAMP}.sql.gz"
TARGET="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

# Prisma stores `?schema=public` in DATABASE_URL; pg_dump rejects it. Strip non-pg query params.
PG_URL="$(echo "${DATABASE_URL}" | sed -E 's/[?&]schema=[^&]*//; s/\?$//')"

echo "→ Dumping database to ${TARGET}…"
pg_dump \
  --dbname="${PG_URL}" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip --best > "${TARGET}"

SIZE_HUMAN="$(du -h "${TARGET}" | cut -f1)"
echo "✓ Backup complete: ${TARGET} (${SIZE_HUMAN})"

# Optional S3 upload
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "⚠ BACKUP_S3_BUCKET set but 'aws' CLI not installed — skipping upload." >&2
  else
    S3_KEY="postgres/${TIMESTAMP}/${FILENAME}"
    echo "→ Uploading to s3://${BACKUP_S3_BUCKET}/${S3_KEY}…"
    aws s3 cp "${TARGET}" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
      --storage-class STANDARD_IA \
      --only-show-errors
    echo "✓ Uploaded."
  fi
fi

# Prune local backups older than retention window
if [[ -d "${BACKUP_DIR}" ]]; then
  PRUNED="$(find "${BACKUP_DIR}" -name 'ms2app-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)"
  if [[ "${PRUNED}" -gt 0 ]]; then
    echo "✓ Pruned ${PRUNED} local backup(s) older than ${RETENTION_DAYS} days."
  fi
fi

echo "Done."
