# Cursor Cloud development environment

This folder defines a reproducible **Cursor Cloud Agent** environment for the 3Peaks Umami fork: Node.js, pnpm, PostgreSQL, schema migrations, and optional demo analytics.

Official reference: [Cursor Cloud Agent setup](https://cursor.com/docs/cloud-agent/setup).

## Files

| File | Purpose |
|------|---------|
| [`environment.json`](./environment.json) | Cursor environment config (Docker base, install/start, port 3000, dev terminal) |
| [`Dockerfile`](./Dockerfile) | Base image: Node 22 + PostgreSQL (Debian bookworm) |
| [`start-services.sh`](./start-services.sh) | Start Postgres on VM boot (`start` hook) |
| [`setup-dev-env.sh`](./setup-dev-env.sh) | Idempotent bootstrap on each session (`install` hook) |
| [`verify-dev-env.sh`](./verify-dev-env.sh) | Health checks for agents and humans |

## How Cursor uses this

1. **Build** — Image from `.cursor/Dockerfile` (context = repo root).
2. **Start** (once per boot) — `bash .cursor/start-services.sh` starts PostgreSQL.
3. **Install** (after each `git pull`) — `pnpm install && bash .cursor/setup-dev-env.sh`:
   - Copies [`.env.example`](../.env.example) → `.env` if missing
   - Ensures `umami` DB user/database exist
   - Runs `pnpm run build-db` and `pnpm run update-db`
   - Optionally runs seed when `UMAMI_SEED_DATA=1`
4. **Terminal** — `pnpm dev` → http://localhost:3000

Repo-level `environment.json` overrides dashboard environment settings when present.

## First-time / manual setup (without Cursor)

From the repository root:

```bash
cp .env.example .env
pnpm install
bash .cursor/setup-dev-env.sh
pnpm dev
```

In another shell (after the dev server is up):

```bash
bash .cursor/verify-dev-env.sh
```

## Seeding data

### Default admin user (always)

Initial migrations create:

- **Username:** `admin`
- **Password:** `umami`

No extra seed step is required to log in.

### Demo analytics (optional)

[`pnpm run seed-data`](../package.json) generates sample websites and traffic (blocked in production / Vercel).

**Via setup script** (recommended in Cloud):

```bash
UMAMI_SEED_DATA=1 bash .cursor/setup-dev-env.sh
```

**Directly** (dev server can be stopped):

```bash
pnpm run seed-data              # 30 days (default)
pnpm run seed-data -- --days 7  # 7 days
pnpm run seed-data -- --clear   # remove prior demo data first
```

Creates **Demo Blog** and **Demo SaaS** with realistic pageviews/events. Fleet (`/fleet`) will show non-zero metrics after seeding.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres URL (see `.env.example`) |
| `APP_SECRET` | Yes | Session/signing secret |
| `UMAMI_SEED_DATA` | No | Set to `1` during `setup-dev-env.sh` to run `seed-data` |
| `UMAMI_VERIFY_URL` | No | Base URL for verify script (default `http://localhost:3000`) |

Optional stack components (not needed for basic dev): `REDIS_URL`, `CLICKHOUSE_URL`, `KAFKA_URL`, etc. See root [README.md](../README.md).

## Verification

With Postgres up and `pnpm dev` running:

```bash
bash .cursor/verify-dev-env.sh
```

Checks:

1. PostgreSQL accepting connections (`pg_isready`)
2. `.env` exists
3. `pnpm test` (Vitest, 32 tests — no live DB)
4. `GET /api/heartbeat` → `{"ok":true}`
5. `POST /api/auth/login` with `admin` / `umami` returns a token
6. `GET /fleet` responds (fork-specific)

### Manual smoke test

1. Open http://localhost:3000/login
2. Sign in as **admin** / **umami**
3. Confirm redirect to **Fleet**
4. Open http://localhost:3000/fleet for aggregated fleet analytics

### Lint

```bash
pnpm lint
```

Note: upstream may report a pre-existing Biome schema/version warning; that is unrelated to environment setup.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DATABASE_URL is not defined` | Run `bash .cursor/setup-dev-env.sh` or copy `.env.example` → `.env` |
| Postgres not ready | `bash .cursor/start-services.sh` then `pg_isready -h localhost` |
| Migrations out of date | `pnpm run update-db` |
| Verify fails on heartbeat | Start `pnpm dev` and wait for port 3000 |
| `seed-data` refuses to run | Do not set `VERCEL`/`NODE_ENV=production`; use local VM only |

## Related docs

- [AGENTS.md](../AGENTS.md) — short Cloud Agent cheat sheet
- [README.md](../README.md) — product and 3Peaks fork deployment notes
