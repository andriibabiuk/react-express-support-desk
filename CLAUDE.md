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

## Data fetching

Client-side HTTP calls to the API use **axios**, not the raw `fetch` API, and
server state is managed with **@tanstack/react-query** (`useQuery`/
`useMutation`), not manual `useEffect`/`useState` fetch plumbing. A
`QueryClient`/`QueryClientProvider` is set up once in `App.tsx`. See
`client/src/pages/HomePage.tsx` and `client/src/pages/UsersPage.tsx` for the
pattern (axios call as the `queryFn`, `isPending`/`isError`/`data` driving the
UI) before adding a new data-fetching component.

## Authentication

Email/password auth via **better-auth** (`^1.6.x`). No self-serve sign-up —
users are provisioned only via the seed script.

- `server/src/lib/auth.ts` — `betterAuth()` config: `basePath: '/api/auth'`,
  `prismaAdapter` against the `supportdesk` DB, `trustedOrigins` from
  `CLIENT_URL`, `emailAndPassword.disableSignUp: true`. Adds a required
  `role` field to the user model (`admin` | `agent`, `input: false` so
  clients can't self-assign it, defaults to `agent`).
- `server/index.ts` — mounts the auth handler on
  `app.all('/api/auth/{*any}', ...)` via `toNodeHandler(auth)` *before*
  `express.json()` is registered. `server/src/middleware/require-auth.ts`
  (`requireAuth`) calls `auth.api.getSession`, attaches `req.user` /
  `req.session`, and 401s otherwise — apply it to any route that needs a
  signed-in user (see `/api/me` for the pattern).
- `server/prisma/seed.ts` — creates the one admin user via
  `auth.$context.internalAdapter` + `ctx.password.hash`, reading
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `server/.env`. Run with
  `bun run seed` from `server/` after migrating.
- `client/src/lib/auth-client.ts` — `createAuthClient()` from
  `better-auth/react` (no explicit `baseURL`; relies on the Vite proxy to
  reach `/api/auth` same-origin). Exposes a `useAuth()` hook wrapping
  `useSession()`.
- `client/src/pages/LoginPage.tsx` — email/password form
  (react-hook-form + zod) calling `authClient.signIn.email`.
- `client/src/components/ProtectedRoute.tsx` — route guard: redirects to
  `/login` when there's no session, otherwise renders `NavBar` + the
  matched route. Wired up in `App.tsx` around the authenticated routes.

Required env vars (see `server/.env.example`): `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `CLIENT_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

## Versions in use

Installed via Bun from npm, not pinned to older training-data defaults:
Express 5.x, React 19.x, Vite 8.x, TypeScript 6.x, Prisma 7.x. Confirm exact
versions in each workspace's `package.json` before assuming API shape — Prisma
7 in particular changed the generator/driver-adapter model from earlier
majors, so check context7 before assuming v5/v6-era APIs still apply.

## Testing

E2E tests are Playwright-based (root `playwright.config.ts`, `e2e/` dir) with
their own isolated test database and ports — separate from normal `bun run
dev`. Use the **playwright-e2e-tester** agent to write or extend end-to-end
tests; it already knows the test-environment setup (test DB reset flow,
dedicated ports, Prisma's AI-consent gate on destructive commands, and this
environment's headless-browser-hang quirk), so don't duplicate that context
here — see `.claude/agents/playwright-e2e-tester.md` for the details.

## Not yet implemented

Ticket CRUD, data models beyond the auth User (Ticket, etc.), AI features
(Claude API), email integration, dashboard, Docker — see
`implementation-plan.md` for the phase breakdown.
