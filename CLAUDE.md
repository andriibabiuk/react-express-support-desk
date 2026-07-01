# Support Desk

AI-powered support ticket management system. See `project-scope.md` for the
feature spec, `tech-stack.md` for the chosen stack, and `implementation-plan.md`
for the phased build-out.

## Documentation lookups

Use the **context7** MCP server for any library/framework/API question (Express,
React, Vite, Prisma, Tailwind, React Router, Bun, etc.) instead of relying on
training data or web search — training data can be stale on fast-moving
libraries, and this stack pins specific major versions (see below).

## Structure

Bun workspace monorepo:

- `client/` — React 19 + TypeScript, scaffolded with Vite (`bun create vite`).
  Dev server proxies `/api/*` to the server on port 4000 (see `vite.config.ts`).
- `server/` — Express 5 + TypeScript, run directly by the Bun runtime (no
  build step). Entry point `server/index.ts`.
- `server/prisma/schema.prisma` — Prisma ORM against a local PostgreSQL
  database named `supportdesk`. Prisma 7 requires an explicit driver adapter
  (no default query engine); the app uses `@prisma/adapter-pg`, wired up in
  `server/src/lib/prisma.ts`. Generated client output goes to
  `server/generated/prisma` (gitignored — regenerated via `postinstall` /
  `prisma generate`). Connection string lives in `server/.env`
  (gitignored; see `server/.env.example` for the shape). Run migrations with
  `bun run migrate` (alias for `prisma migrate dev`) from `server/`.

Root `package.json` scripts (Bun workspaces, `--filter '*'`):

- `bun run dev` — runs both `client` and `server` dev scripts in parallel
- `bun run build` — runs `build` in every workspace that defines one (client only)

## Versions in use

Installed via Bun from npm, not pinned to older training-data defaults:
Express 5.x, React 19.x, Vite 8.x, TypeScript 6.x, Prisma 7.x. Confirm exact
versions in each workspace's `package.json` before assuming API shape — Prisma
7 in particular changed the generator/driver-adapter model from earlier
majors, so check context7 before assuming v5/v6-era APIs still apply.

## Not yet implemented

Authentication, ticket CRUD, data models (User/Ticket), AI features (Claude
API), email integration, dashboard, Docker — see `implementation-plan.md` for
the phase breakdown.
