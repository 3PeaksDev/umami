# Cursor Cloud Agent base image: Node + PostgreSQL for Umami local dev.
# Build context is the repository root (see environment.json).

FROM node:22-bookworm

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    curl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@10.33.3 --activate

WORKDIR /workspace
