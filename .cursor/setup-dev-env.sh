#!/usr/bin/env bash
# Idempotent local dev bootstrap: .env, Postgres role/DB, Prisma client, migrations.
# Optional demo data when UMAMI_SEED_DATA=1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Load DATABASE_URL if present
set -a
# shellcheck disable=SC1091
source .env
set +a

export DATABASE_URL="${DATABASE_URL:-postgresql://umami:umami@localhost:5432/umami}"

bash .cursor/start-services.sh

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Use the Cursor environment built from .cursor/Dockerfile." >&2
  exit 1
fi

# Create application role and database (matches .env.example)
if command -v sudo >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='umami'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE USER umami WITH PASSWORD 'umami' CREATEDB;"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='umami'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE umami OWNER umami;"
else
  # Container / root: connect as postgres OS user without sudo
  run_psql() {
    if id postgres >/dev/null 2>&1; then
      su - postgres -c "psql $*"
    else
      psql -U postgres "$@"
    fi
  }
  run_psql -tc "SELECT 1 FROM pg_roles WHERE rolname='umami'" | grep -q 1 \
    || run_psql -c "CREATE USER umami WITH PASSWORD 'umami' CREATEDB;"
  run_psql -tc "SELECT 1 FROM pg_database WHERE datname='umami'" | grep -q 1 \
    || run_psql -c "CREATE DATABASE umami OWNER umami;"
fi

pnpm run build-db
pnpm run update-db

if [[ "${UMAMI_SEED_DATA:-0}" == "1" ]]; then
  echo "UMAMI_SEED_DATA=1: generating demo analytics (this may take a minute)..."
  pnpm run seed-data -- --days 7
fi

echo "Dev environment ready (DB migrated). Default login: admin / umami"
