<p align="center">
  <img src="https://content.umami.is/website/images/umami-logo.png" alt="Umami Logo" width="100">
</p>

<h1 align="center">Umami</h1>

<p align="center">
  <i>Umami is a simple, fast, privacy-focused alternative to Google Analytics.</i>
</p>

<p align="center">
  <a href="https://github.com/umami-software/umami/releases"><img src="https://img.shields.io/github/release/umami-software/umami.svg" alt="GitHub Release" /></a>
  <a href="https://github.com/umami-software/umami/blob/master/LICENSE"><img src="https://img.shields.io/github/license/umami-software/umami.svg" alt="MIT License" /></a>
  <a href="https://github.com/umami-software/umami/actions"><img src="https://img.shields.io/github/actions/workflow/status/umami-software/umami/ci.yml" alt="Build Status" /></a>
  <a href="https://analytics.umami.is/share/LGazGOecbDtaIwDr/umami.is" style="text-decoration: none;"><img src="https://img.shields.io/badge/Try%20Demo%20Now-Click%20Here-brightgreen" alt="Umami Demo" /></a>
</p>

---

## 🏢 How we use this fork (3Peaks local SEO)

> This section documents how this fork is operated inside our business. Everything below is fork-specific and not part of upstream Umami.

This is the **first-party analytics backend for our local-SEO website fleet** (~3,053 service-area sites). We run it self-hosted so that, from a visitor's or search engine's perspective, every site only ever talks to its own domain — there is no shared third-party analytics host to correlate the network.

### Deployment

- **Hosting:** this fork is deployed on **Vercel** (project `umami`), backed by a **dedicated Neon Postgres project** (`local-seo-analytics`) that is separate from the main application database.
- **Origin URL** (`UMAMI_ORIGIN`, server-side only, never exposed to browsers): `https://local-seo-analytics.vercel.app`.
- Deploys happen automatically on push to this fork.

### How tracking reaches the sites

The tracker is **never baked into the static sites**. Instead, a Cloudflare Worker that already fronts every domain injects it at the edge and proxies it first-party:

1. Each site's Umami `websiteId` (a UUID) is stored canonically in the main app DB as `Website.umamiWebsiteId`.
2. A deploy-time map (`domain → websiteId`) is bundled into the Cloudflare Worker.
3. For HTML responses on mapped domains, the Worker injects:
   `<script defer src="/_a/script.js" data-website-id="<uuid>" data-host-url="<origin>/_a">`.
4. The Worker reverse-proxies `/_a/*` to this Umami instance (`/_a/script.js → /script.js`, `/_a/api/send → /api/send`), forwarding the real client IP so geo/device data stays accurate.

Enabling/disabling analytics for a domain is a DB update + fast Worker redeploy — it never triggers a site rebuild.

### What we track

- **Pageviews** (automatic).
- **Custom conversion events**, the metrics that matter for local SEO:
  - `phone_call` — any click on a `tel:` link, with `{ page, number }`.
  - `form_submit` — a successful contact-form submission, with `{ page }`.

### Fork-specific additions

- **Fleet page (`/fleet`):** a custom, admin-gated page that aggregates **across all sites at once** (something native Umami does not offer — every native dashboard is per-site). It surfaces fleet-wide traffic and channel mix, plus `phone_call`/`form_submit` conversions broken down by acquisition source (organic search, social, direct, referral, paid), attributed to each visit's first touch. AI engines (ChatGPT, Perplexity, etc.) are treated as organic search, with the raw referrer domain available as a drill-down.

### Keeping in sync with upstream

We deliberately implement fork additions as **net-new files** wherever possible to minimize merge conflicts when pulling upstream Umami releases.

---

## 🚀 Getting Started

A detailed getting started guide can be found at [umami.is/docs](https://umami.is/docs/).

---

## 🛠 Installing from Source

### Requirements

- A server with Node.js version 18.18+.
- A PostgreSQL database version v12.14+.

### Get the source code and install packages

```bash
git clone https://github.com/umami-software/umami.git
cd umami
pnpm install
```

### Configure Umami

Create an `.env` file with the following:

```bash
DATABASE_URL=connection-url
```

The connection URL format:

```bash
postgresql://username:mypassword@localhost:5432/mydb
```

### Build the Application

```bash
pnpm run build
```

The build step will create tables in your database if you are installing for the first time. It will also create a login user with username **admin** and password **umami**.

### Start the Application

```bash
pnpm run start
```

By default, this will launch the application on `http://localhost:3000`. You will need to either [proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) requests from your web server or change the [port](https://nextjs.org/docs/api-reference/cli#production) to serve the application directly.

---

## 🐳 Installing with Docker

Umami provides Docker images as well as a Docker compose file for easy deployment.

Docker image:

```bash
docker pull docker.umami.is/umami-software/umami:latest
```

Docker compose (Runs Umami with a PostgreSQL database):

```bash
docker compose up -d
```

---

## 🔄 Getting Updates

To get the latest features, simply do a pull, install any new dependencies, and rebuild:

```bash
git pull
pnpm install
pnpm build
```

To update the Docker image, simply pull the new images and rebuild:

```bash
docker compose pull
docker compose up --force-recreate -d
```

---

## 🛟 Support

<p align="center">
  <a href="https://github.com/umami-software/umami"><img src="https://img.shields.io/badge/GitHub--blue?style=social&logo=github" alt="GitHub" /></a>
  <a href="https://twitter.com/umami_software"><img src="https://img.shields.io/badge/Twitter--blue?style=social&logo=twitter" alt="Twitter" /></a>
  <a href="https://linkedin.com/company/umami-software"><img src="https://img.shields.io/badge/LinkedIn--blue?style=social&logo=linkedin" alt="LinkedIn" /></a>
  <a href="https://umami.is/discord"><img src="https://img.shields.io/badge/Discord--blue?style=social&logo=discord" alt="Discord" /></a>
</p>

[release-shield]: https://img.shields.io/github/release/umami-software/umami.svg
[releases-url]: https://github.com/umami-software/umami/releases
[license-shield]: https://img.shields.io/github/license/umami-software/umami.svg
[license-url]: https://github.com/umami-software/umami/blob/master/LICENSE
[build-shield]: https://img.shields.io/github/actions/workflow/status/umami-software/umami/ci.yml
[build-url]: https://github.com/umami-software/umami/actions
[github-shield]: https://img.shields.io/badge/GitHub--blue?style=social&logo=github
[github-url]: https://github.com/umami-software/umami
[twitter-shield]: https://img.shields.io/badge/Twitter--blue?style=social&logo=twitter
[twitter-url]: https://twitter.com/umami_software
[linkedin-shield]: https://img.shields.io/badge/LinkedIn--blue?style=social&logo=linkedin
[linkedin-url]: https://linkedin.com/company/umami-software
[discord-shield]: https://img.shields.io/badge/Discord--blue?style=social&logo=discord
[discord-url]: https://discord.com/invite/4dz4zcXYrQ
