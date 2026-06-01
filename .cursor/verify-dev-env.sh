#!/usr/bin/env bash
# Verification checks for Cursor Cloud / local dev. Exit non-zero on failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

BASE_URL="${UMAMI_VERIFY_URL:-http://localhost:3000}"
FAIL=0

log() { echo "[verify] $*"; }
fail() { echo "[verify] FAIL: $*" >&2; FAIL=1; }

log "Checking PostgreSQL..."
if command -v pg_isready >/dev/null 2>&1; then
  pg_isready -h localhost -q || fail "PostgreSQL is not accepting connections"
else
  log "pg_isready not found; skipping Postgres check"
fi

if [[ -f .env ]]; then
  log "Found .env"
else
  fail "Missing .env — run: bash .cursor/setup-dev-env.sh"
fi

log "Running unit tests (Vitest, no DB required)..."
pnpm test || fail "pnpm test failed"

log "Checking app heartbeat at ${BASE_URL}/api/heartbeat ..."
if curl -sf "${BASE_URL}/api/heartbeat" | grep -q '"ok"'; then
  log "Heartbeat OK"
else
  fail "Heartbeat failed — is 'pnpm dev' running? (${BASE_URL})"
fi

log "Checking admin login API..."
LOGIN_JSON="$(curl -sf -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"umami"}')" || fail "Login request failed"

if echo "${LOGIN_JSON}" | grep -q '"token"'; then
  log "Login OK (admin)"
else
  fail "Login response missing token"
fi

log "Checking Fleet page (fork)..."
FLEET_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/fleet")"
if [[ "${FLEET_CODE}" == "200" ]] || [[ "${FLEET_CODE}" == "307" ]] || [[ "${FLEET_CODE}" == "302" ]]; then
  log "Fleet route responded (${FLEET_CODE})"
else
  fail "Fleet route returned HTTP ${FLEET_CODE}"
fi

if [[ "${FAIL}" -ne 0 ]]; then
  echo "[verify] One or more checks failed." >&2
  exit 1
fi

echo "[verify] All checks passed."
