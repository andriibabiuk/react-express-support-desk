# Support Desk

An AI-powered support ticket management system. Inbound support emails are
turned into tickets automatically, an AI agent classifies and attempts to
resolve straightforward ones, and human agents manage everything else through
a dashboard with sorting, filtering, and search.

See [`project-scope.md`](project-scope.md) for the full feature spec,
[`tech-stack.md`](tech-stack.md) for the chosen stack, and
[`implementation-plan.md`](implementation-plan.md) for the phased build-out
(and how much of it is actually built so far — see
[Current status](#current-status) below).

## Features

- **Email-to-ticket ingestion** — a webhook endpoint turns an inbound support
  email into a `Ticket` row, with idempotency for retried deliveries.
- **AI auto-resolution** — every ingested ticket is picked up by a background
  job that attempts to resolve it automatically; tickets it can't handle are
  escalated back to the open queue, unassigned, for a human agent.
- **Ticket dashboard** — sortable, filterable, searchable, paginated ticket
  list, plus a stats page (open/resolved counts, % resolved by AI, average
  resolution time, tickets-per-day chart).
- **User management (admin only)** — create, edit, and soft-delete agent
  accounts.
- **Role-based auth** — email/password authentication with `admin` / `agent`
  roles gating routes and UI.
- **Error monitoring** — Sentry wired up on both client and server.

## Tech stack

| Layer          | Choice                                                          |
| -------------- | ---------------------------------------------------------------- |
| Frontend       | React 19 + TypeScript, Vite, Tailwind CSS, React Router           |
| Backend        | Express 5 + TypeScript, run directly by Bun (no build step)      |
| Database       | PostgreSQL, via Prisma 7 (`@prisma/adapter-pg` driver adapter)    |
| Auth           | better-auth (email/password, database sessions)                  |
| Validation     | zod, shared between client and server via the `core` package     |
| Data fetching  | axios + TanStack Query                                            |
| AI             | Google Gemini (`@ai-sdk/google` via the Vercel AI SDK)            |
| Background jobs| pg-boss (Postgres-backed queue), for AI ticket auto-resolution    |
| Testing        | Vitest + React Testing Library (component), Playwright (E2E)      |
| Deployment     | Docker, deployed to Railway as a single service                   |

See [Versions in use](CLAUDE.md#versions-in-use) in `CLAUDE.md` for exact
installed major versions — several (Express 5, React 19, Prisma 7) are recent
majors with API changes from older training-data defaults.

## Project structure

Bun workspace monorepo:

```
client/   React + TypeScript frontend (Vite)
server/   Express + TypeScript backend (run directly by Bun)
core/     Shared code: zod schemas (core/src/schemas) and
          framework-agnostic enum mirrors (core/src/constants)
e2e/      Playwright end-to-end tests, own test DB/ports
```

- `client/` — dev server proxies `/api/*` to the server on port 4000 (see
  `client/vite.config.ts`).
- `server/` — entry point `server/index.ts`, route modules under
  `server/src/routes/`.
- `core/` — no build step, consumed as raw TypeScript by both `client`
  (Vite) and `server` (Bun). Holds schemas/constants that both sides must
  agree on, so they can't drift.
- `server/prisma/schema.prisma` — the Prisma schema, against a local
  PostgreSQL database named `supportdesk`.

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL running locally (a database named `supportdesk`)

### Setup

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
bun install

# 2. Configure environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# then edit server/.env / client/.env — see Environment variables below

# 3. Run database migrations
cd server && bun run migrate && cd ..

# 4. Seed the database (admin user, then the system "AI" agent user)
cd server && bun run seed && bun run seed:ai-agent && cd ..

# 5. Start client + server together
bun run dev
```

The client runs at `http://localhost:5173`, the server at
`http://localhost:4000` (the client proxies `/api/*` to it in dev).

Log in with the credentials set in `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` (see `server/.env.example` for the defaults).

### Environment variables

**`server/.env`** (see `server/.env.example`):

| Variable                       | Purpose                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string                                      |
| `BETTER_AUTH_SECRET`            | Secret for signing sessions (`openssl rand -base64 32`)          |
| `BETTER_AUTH_URL`               | Base URL the server is reachable at                                |
| `CLIENT_URL`                    | Client origin, used for CORS/trusted-origins                      |
| `SEED_ADMIN_EMAIL`              | Email for the admin user created by `bun run seed`                |
| `SEED_ADMIN_PASSWORD`           | Password for that admin user                                      |
| `EMAIL_WEBHOOK_SECRET`          | Shared secret required on inbound-email webhook requests          |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Gemini API key, powers AI ticket classification/resolution        |
| `SENTRY_DSN`                    | Server-side Sentry error reporting (optional)                     |

**`client/.env`** (see `client/.env.example`):

| Variable          | Purpose                                          |
| ------------------ | ------------------------------------------------- |
| `VITE_SENTRY_DSN`  | Client-side Sentry error reporting (optional)     |

## Scripts

From the repo root (Bun workspaces, run across every workspace that defines
the script):

| Command                  | Description                                              |
| -------------------------- | ---------------------------------------------------------- |
| `bun run dev`             | Run `client` and `server` dev servers in parallel          |
| `bun run build`           | Build the client (`tsc -b && vite build`)                  |
| `bun run test`            | Run client component tests (Vitest)                        |
| `bun run test:e2e`        | Reset the E2E test database, then run the Playwright suite |
| `bun run test:e2e:db:reset` | Reset the E2E test database only                          |

From `server/`:

| Command                     | Description                                              |
| ------------------------------ | ---------------------------------------------------------- |
| `bun run dev`                 | Start the server with `--watch`                             |
| `bun run migrate`             | Run Prisma migrations (dev)                                 |
| `bun run migrate:deploy`      | Apply migrations non-interactively (used in deployment)     |
| `bun run seed`                | Seed the admin user                                          |
| `bun run seed:ai-agent`       | Seed the system "AI" agent user (email ingestion assigns tickets to it) |
| `bun run seed:tickets`        | Seed sample tickets                                          |
| `bun run seed:remote` / `seed:tickets:remote` | Run the seed scripts against a deployed (Railway) database — see [Deployment](#deployment) |

## Testing

**Default to component tests** — they're faster and cover most of what this
app needs (form validation, loading/error/success states, API-shape
contracts via mocked axios). Reach for an E2E test only for real
cross-page navigation, actual session/cookie behavior, or an endpoint with
no UI to mount (e.g. the inbound-email webhook).

```bash
bun run test        # component tests (Vitest + React Testing Library)
bun run test:e2e    # Playwright E2E suite (resets its own test DB first)
```

See [Testing](CLAUDE.md#testing) in `CLAUDE.md` for conventions (file
placement, mocking patterns, the E2E test database setup).

## Current status

Not everything in `project-scope.md` / `implementation-plan.md` is built
yet. As of now:

- ✅ Auth (login, sessions, role-based route protection)
- ✅ User management (admin only, soft delete)
- ✅ Email ingestion → ticket creation, with AI auto-resolution
- ✅ Ticket list (sorting, filtering, search, pagination) and dashboard stats
- ⬜ Ticket detail/update/delete/manual-assign UI and endpoints
- ⬜ AI-suggested replies and summaries on a ticket detail view
- ⬜ Real outbound email sending (a real provider like SendGrid/Mailgun isn't
  wired up — inbound ingestion currently accepts a provider-agnostic JSON
  payload instead of a specific vendor's webhook shape)

See [Not yet implemented](CLAUDE.md#not-yet-implemented) in `CLAUDE.md` for
more detail.

## Deployment

Deployed to [Railway](https://railway.app) as a single service — Express
serves both the API and the built client (same origin, so the better-auth
session cookie doesn't need cross-site `SameSite=None` handling). See
[Deployment](CLAUDE.md#deployment) in `CLAUDE.md` for the full Docker /
Railway setup, including how the container seeds itself on first boot and
how to run seed scripts against production via `railway run`.

## Further reading

`CLAUDE.md` is the canonical, detailed reference for this codebase —
conventions for shared schemas, the role/status/category enum-mirroring
pattern, email ingestion internals, dashboard stats, testing, and
deployment. Read it before making non-trivial changes.
