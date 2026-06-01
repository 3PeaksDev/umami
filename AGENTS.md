# AGENTS.md

## Cursor Cloud specific instructions

### Product

Single **Umami** (v3) Next.js app — privacy-focused analytics. This fork adds **3Peaks** branding, a **Fleet** page (`/fleet`), and related APIs. Local dev needs **Node 18.18+**, **pnpm**, and **PostgreSQL 12.14+** (Postgres 16 is fine).

### Services (local)

| Service | Required | How to run |
|---------|----------|------------|
| PostgreSQL | Yes | `sudo pg_ctlcluster 16 main start` (Ubuntu package `postgresql`) or `docker compose up -d db` if Docker is available |
| Umami (Next.js) | Yes | `pnpm dev` → http://localhost:3000 |
| Redis / ClickHouse / Kafka | No | Only when matching env vars are set (`REDIS_URL`, `CLICKHOUSE_URL`, etc.) |

Default seeded login (from initial migration): **admin** / **umami**.

### Environment file

Create `/workspace/.env` (not committed) with at least:

```bash
DATABASE_URL=postgresql://umami:umami@localhost:5432/umami
APP_SECRET=local-dev-secret-change-in-production
```

After Postgres is up: `pnpm run build-db` then `pnpm run update-db` (first time or after schema changes).

### Commands

See `package.json` scripts and [README.md](README.md). Common:

- **Dev:** `pnpm dev` (Turbo; loads `.env` via dotenv)
- **Lint:** `pnpm lint` (Biome) — repo may report a pre-existing schema/version mismatch in `biome.json` vs CLI; do not “fix” unless asked
- **Unit tests:** `pnpm test` (Vitest; no DB required)
- **E2E:** `pnpm cypress-run` (app must be on port 3000; see `cypress/docker-compose.yml`)

### Gotchas

- **`pnpm dev` redirects** to `/websites` after login, not `/dashboard` (Cypress still expects `/dashboard` in some tests).
- **Postgres in Cloud VMs** is installed via apt in setup; ensure the cluster is running before `pnpm dev` (`pg_isready -h localhost`).
- **Docker** is optional; root `docker-compose.yml` runs the published Umami image + Postgres, but many Cloud VMs use apt Postgres instead.
- **`SKIP_DB_CHECK=1`** allows build steps without a live DB (CI pattern); normal dev should not set this.
- Fork **Fleet** UI is at `/fleet` (admin); empty metrics are normal on a fresh DB.
