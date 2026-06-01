#!/usr/bin/env bash
# Start PostgreSQL (idempotent). Used by environment.json "start" on VM boot.
set -euo pipefail

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "PostgreSQL client not installed; skip start-services (use Docker image from .cursor/Dockerfile)." >&2
  exit 0
fi

if pg_isready -h localhost -q 2>/dev/null; then
  exit 0
fi

if command -v pg_ctlcluster >/dev/null 2>&1; then
  PG_VERSION="$(ls /etc/postgresql 2>/dev/null | head -1 || true)"
  if [[ -n "${PG_VERSION}" ]]; then
    pg_ctlcluster "${PG_VERSION}" main start || true
  fi
elif command -v service >/dev/null 2>&1; then
  service postgresql start || true
fi

for _ in $(seq 1 30); do
  if pg_isready -h localhost -q 2>/dev/null; then
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready within 30s." >&2
exit 1
