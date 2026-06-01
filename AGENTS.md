# AGENTS.md

## Cursor Cloud specific instructions

**Full setup, seeding, and verification:** see [.cursor/README.md](.cursor/README.md).

The repo includes [`.cursor/environment.json`](.cursor/environment.json) (Node + PostgreSQL Docker image, `install` / `start` hooks, `pnpm dev` terminal on port 3000).

### Quick reference

| Step | Command |
|------|---------|
| Bootstrap DB + `.env` | `bash .cursor/setup-dev-env.sh` |
| Start Postgres (boot) | `bash .cursor/start-services.sh` |
| Dev server | `pnpm dev` → http://localhost:3000 |
| Verify | `bash .cursor/verify-dev-env.sh` |
| Optional demo data | `UMAMI_SEED_DATA=1 bash .cursor/setup-dev-env.sh` or `pnpm run seed-data` |

**Login (from migrations):** `admin` / `umami`

### Services

| Service | Required |
|---------|----------|
| PostgreSQL | Yes (in `.cursor/Dockerfile` or apt) |
| Umami (Next.js) | Yes (`pnpm dev`) |
| Redis / ClickHouse / Kafka | No |

### Gotchas

- After login, dev redirects to `/websites`, not `/dashboard`.
- Fleet page: `/fleet` (admin; empty until seed or real traffic).
- `pnpm test` does not need Postgres; `pnpm dev` does.
- `.env` is gitignored — created from `.env.example` by `setup-dev-env.sh`.
