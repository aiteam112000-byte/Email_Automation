# ReachX — Email Marketing Platform

ReachX is a full-stack email marketing platform built for modern GTM teams. It combines Gmail & Zoho OAuth sending, real-time email validation, per-recipient pixel tracking, visual workflow automation, and deep campaign analytics—all in one place.

---

#+ ReachX — Email Marketing Platform

ReachX is a full-stack email marketing and automation platform that combines provider-managed sending (Gmail & Zoho), contact validation, per-recipient tracking (pixels & link rewrite), visual workflow automation, and campaign analytics.

This README documents developer setup, architecture, features, runtime behavior, and troubleshooting pointers so you can run and extend ReachX locally or deploy it to production.

## Contents

- Project overview and features
- Architecture & tech stack
- Quick start (dev)
- Environment variables
- Database & migrations
- Running workers and scheduler
- API reference (high level)
- OAuth setup (Gmail & Zoho)
- Deployment notes and troubleshooting
- Contributing

## Key Features

- Multi-provider sending: Gmail (OAuth) and Zoho (OAuth) with provider priority and round-robin per-account sending.
- Campaign engine: create, draft, schedule, attach files, personalize templates with `{{name}}`, `{{company}}`, `{{email}}` placeholders.
- Recipient-level tracking: unique pixel for opens, rewritten links for click tracking, unsubscribe handling, and per-recipient events.
- Email validation: quick format + MX checks and configurable validation flow before send.
- Visual workflow builder: create workflows (trigger, send, wait, conditionals, tag operations) and enroll recipients into follow-ups.
- Background processing: BullMQ queues using Redis for email and workflow processing; separate workers for scalable processing.
- Uploads & pixel assets: upload and manage images and attachments; assets served from `/uploads`.

## Architecture & Tech Stack

- Frontend: React + Vite, Tailwind CSS. `reachx-frontend` contains the UI (auth, campaign builder, workflow canvas, dashboard).
- Backend: Node.js + Express in `reachx-backend` exposing a JSON API.
- DB: PostgreSQL (accessed via Prisma ORM).
- Queues: BullMQ with Redis for email and workflow processing.
- Auth: JWT-based API auth; OAuth flows for Gmail and Zoho account connections.
- Email sending: Nodemailer for Gmail (using OAuth tokens) and Zoho Mail REST API for Zoho sends.

## Repo layout (short)

- `reachx-backend/` — Express API, Prisma schema, workers, routes, libs
- `reachx-frontend/` — Vite React app (dashboard, auth, workflow canvas)

## Quick start (development)

Prerequisites
- Node.js 20+ (LTS recommended)
- PostgreSQL
- Redis

Install

1. Install dependencies for backend and frontend

```bash
cd reachx-backend
npm install

cd ../reachx-frontend
npm install
```

2. Copy environment templates and set values

- Create `reachx-backend/.env` (see Environment variables section below)
- Create `reachx-frontend/.env` and set `VITE_API_URL` (e.g. `http://localhost:4000`)

3. Initialize database and apply Prisma migrations

```bash
cd reachx-backend
npx prisma migrate dev   # during development
# or: npx prisma migrate deploy  # in CI/prod
```

4. Start services

Backend (dev):

```bash
cd reachx-backend
npm run dev
```

Workers (run in separate terminals):

```bash
cd reachx-backend
node src/workers/emailWorker.js
node src/workers/workflowWorker.js
```

Frontend (dev):

```bash
cd reachx-frontend
npm run dev
```

Open `http://localhost:3000` to view the frontend.

## Environment variables

Populate `reachx-backend/.env` with at least the following keys (examples):

- `DATABASE_URL` — postgres connection string
- `JWT_SECRET` — secret for signing user JWTs
- `APP_URL` — public/back-end base URL (used for asset links)
- `FRONTEND_URL` — frontend base URL
- `PORT` — backend port (defaults to 4000)
- `REDIS_URL` — redis connection

OAuth / provider variables:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, `ZOHO_AUTH_DOMAIN`

Optional / integrations:
- `GEMINI_API_KEY`, `GEMINI_PROJECT` — for AI email template generation

Security notes: keep these values out of source control. Use platform secrets in production.

## Database & Prisma

- Schema is in `reachx-backend/prisma/schema.prisma`. Models include `User`, `Campaign`, `Recipient`, `Event`, `Contact`, `GmailAccount`, `ZohoAccount`, `Workflow`, etc.
- Use `npx prisma migrate dev` during active schema development and `npx prisma migrate deploy` in CI/prod.
- For quick dev sync you can use `npx prisma db push` (note: this skips some migration checks).

## Background Workers & Scheduler

- Email sends and workflow execution are processed by worker scripts in `reachx-backend/src/workers/`.
- Queue names and processors are defined in `reachx-backend/src/lib/queue.js` (email queue) and `workflowQueue.js`.
- To run workers locally, start them with Node directly or use a process manager (PM2) in production.
- The API server includes a lightweight scheduler that POSTs to `/api/cron/send-scheduled` every 60 seconds when enabled via `ENABLE_SCHEDULER=true` and a `CRON_SECRET` configured. Alternatively run a cron job or job runner in production.

## Sending behavior and provider selection

- When sending a campaign the backend checks for active Zoho accounts for the user. If any are available, Zoho is preferred. Otherwise, active Gmail accounts are used.
- Sends are round-robined across active accounts for the selected provider to distribute load and avoid per-account rate limits.
- Attachments uploaded to campaigns are stored in the `uploads/` folder and referenced via `APP_URL`.

## API (high-level)

The backend exposes JSON REST endpoints under `/api/*`. Key groups:

- `POST /api/auth/*` — register, login, OAuth helper endpoints
- `GET/POST /api/campaigns` — create, list, draft, send, schedule, attach files
- `GET/POST /api/contacts` — import, list, manage contacts
- `GET/POST /api/pixels` — upload and list pixel/image assets
- `GET /api/track` — tracking pixel and click redirects (records opens/clicks)
- `GET/POST /api/gmail` and `/api/zoho` — provider connect, callback, list accounts
- `GET/POST /api/workflows` — workflow CRUD and step saves

For developer exploration, see route implementations in `reachx-backend/src/routes/`.

## OAuth: Gmail & Zoho setup (dev)

Gmail (Google Cloud Console):

1. Create a Google Cloud project and enable Gmail API.
2. Create OAuth 2.0 credentials (web application).
3. Add `http://localhost:4000/api/gmail/callback` as an authorized redirect URI.
4. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `reachx-backend/.env`.

Zoho (Zoho API Console):

1. Create a Self Client or Server-based client in Zoho API Console for your region.
2. Add `http://localhost:4000/api/zoho/callback` and `http://localhost:4000/api/auth/zoho-callback` as redirect URIs.
3. Set `ZOHO_AUTH_DOMAIN` to your region (`https://accounts.zoho.in`, `https://accounts.zoho.com`, etc.).

See `reachx-frontend` UI under Settings → Connect for the in-app flows.

## Deployment notes

- Use environment variables to store secrets and configure the platform (DATABASE_URL, REDIS_URL, JWT_SECRET, OAuth client secrets).
- Run workers separately from web processes for reliability and horizontal scaling.
- Use a managed Postgres and Redis in production; ensure network and auth are locked down.
- Consider using PM2, systemd, or container orchestration (Docker Compose / Kubernetes) to run the backend + workers.

Minimal Docker Compose (example)

```yaml
version: '3.8'
services:
    db:
        image: postgres:15
        environment:
            POSTGRES_DB: reachx
            POSTGRES_USER: reachx
            POSTGRES_PASSWORD: reachx
    redis:
        image: redis:7
    backend:
        build: ./reachx-backend
        env_file: ./reachx-backend/.env
        depends_on: [db, redis]
    frontend:
        build: ./reachx-frontend
        env_file: ./reachx-frontend/.env
        ports: ["3000:3000"]
```

## Troubleshooting & Tips

- Health check: `GET /health` returns `{ status: "ok" }` when the server is running.
- If scheduled campaigns aren't processed, ensure `ENABLE_SCHEDULER=true` or run an external cron to POST `/api/cron/send-scheduled` with the `x-cron-secret` header.
- Common issues:
    - OAuth redirect URI mismatch: verify values in provider console match `.env` values
    - Prisma migration errors: use `npx prisma migrate status` to inspect migration state
    - Emails failing: check worker logs and provider account token expiry; refresh OAuth tokens as needed

## Developer notes

- API route implementations live in `reachx-backend/src/routes/` — start with `auth.js`, `campaigns.js`, and `gmail.js` to understand connect/send flow.
- Mail sending logic is in `reachx-backend/src/lib/gmail.js` and `src/lib/smtp.js`. Link rewriting and tracking lives in `src/lib/rewriteLinks.js` and `src/routes/track.js`.

## Contributing

- Fork, create a feature branch, run tests (if added), and open a PR with a clear description of changes.
- Keep secrets out of commits; use `.env` or CI secrets.

---

If you'd like, I can also:
- add a `docker-compose.yml` and `Dockerfile` stubs for backend/frontend,
- add a `make`/`npm` script for running workers locally,
- or generate a short CONTRIBUTING.md outlining PR workflow.

License: MIT
