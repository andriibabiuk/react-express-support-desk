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
  build step). Entry point `server/index.ts`, with route modules under
  `server/src/routes/` (e.g. `users.ts`, `emails.ts`, mounted in `index.ts`
  via `app.use('/api/users', usersRouter)`-style calls).
- `core/` — shared TypeScript package with no build step (consumed as raw
  `.ts` source, same as `server`); holds code that both `client` and `server`
  need, split into `core/src/schemas/` (zod schemas, see
  [Validation](#validation) below) and `core/src/constants/` (enums, see
  [Never compare roles, ticket categories, or ticket statuses against raw
  strings](#never-compare-roles-ticket-categories-or-ticket-statuses-against-raw-strings)
  below) — put a new shared file in whichever of the two it is, not loose at
  `core/src/`.
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
`client/src/pages/HomePage.tsx` and `client/src/components/UsersTable.tsx`
for the pattern (axios call as the `queryFn`, `isPending`/`isError`/`data`
driving the UI) before adding a new data-fetching component.

## Validation

**zod** (`^4.x`) is the data validator on both sides of the stack, not
hand-rolled checks.

- Client: form schemas paired with `react-hook-form` via
  `@hookform/resolvers/zod` (`zodResolver`) — see
  `client/src/pages/LoginPage.tsx` and
  `client/src/components/UserDialog.tsx` (one dialog, `mode: 'create' |
  'edit'`, driving `createUserSchema`/`updateUserSchema` from `core`).
- Server: request bodies are validated with a zod schema before touching the
  DB — see the `POST /api/users` and `PATCH /api/users/:id` handlers in
  `server/src/routes/users.ts` (`schema.safeParse(req.body)`, errors
  formatted with `z.prettifyError` and returned as 400s).

### Shared schemas live in `core`

If a zod schema describes a shape both `client` and `server` need to agree on
(e.g. a request payload validated server-side and driving a form
client-side), define it once in the `core` workspace package, not
independently on each side — the `client`/`server` copies will drift.

- Add the schema (and its inferred type, `z.infer<typeof schema>`) to a file
  under `core/src/schemas/` — one file per resource, e.g.
  `core/src/schemas/user.ts` holds `createUserSchema` / `CreateUserInput` and
  `updateUserSchema` / `UpdateUserInput` (the latter's `password` field is
  optional-by-blank — empty string means "don't change the password",
  enforced by a `.refine` rather than `.optional()` since the form always
  submits a string), and `core/src/schemas/ticket.ts` holds
  `createTicketSchema` / `CreateTicketInput` (shared with
  `server/src/routes/emails.ts`'s inbound-email handler — see
  [Email ingestion](#email-ingestion)). Factor out fields shared between
  sibling schemas (e.g. `name`/`email` between create and update) into local
  consts reused via spread, rather than duplicating the validation rules.
  Re-export everything from `core/src/index.ts`.
- `core/package.json` has no build step — `exports["."]` points straight at
  `./src/index.ts`, consumed as raw TypeScript by both Bun (`server`) and
  Vite (`client`), same as how `server` itself runs. Add any schema-only
  dependency (e.g. `zod`) to `core/package.json`, not just the consumers.
- Reference it with a plain package import — `import { createUserSchema }
  from 'core'` — from both `client` and `server`. Both workspaces depend on
  it via `"core": "workspace:*"` in their `package.json`; after adding a new
  consumer, run `bun install` from the repo root to link it into that
  workspace's `node_modules`.
- A schema that's only ever used on one side (e.g. an env-var schema that's
  server-only) normally stays local to that workspace — don't move it to
  `core` pre-emptively. `createTicketSchema` is a deliberate exception: it
  currently has only one consumer (`emails.ts`), but lives in `core` anyway
  in anticipation of a client-side ticket form once Phase 4 ships.

## Authentication

Email/password auth via **better-auth** (`^1.6.x`). No self-serve sign-up —
users are provisioned only via the seed script.

- `server/src/lib/auth.ts` — `betterAuth()` config: `basePath: '/api/auth'`,
  `prismaAdapter` against the `supportdesk` DB, `trustedOrigins` from
  `CLIENT_URL`, `emailAndPassword.disableSignUp: true`. Adds a required
  `role` field to the user model (`Role.admin` | `Role.agent`, `input: false`
  so clients can't self-assign it, defaults to `Role.agent`).
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

### Never compare roles, ticket categories, or ticket statuses against raw strings

`'admin'` / `'agent'` must never appear as string literals in application
code — always go through a `Role` enum, so a typo or a future role rename is
a compile error instead of a silent no-op comparison. The same rule applies
to `TicketCategory` and `TicketStatus`.

- Server: `import { Role } from '@prisma/client'` — it's generated from the
  `enum Role { admin agent }` in `server/prisma/schema.prisma`, so it's
  already the single source of truth there. See
  `server/src/middleware/require-admin.ts` (`req.user.role !== Role.admin`),
  `server/src/lib/auth.ts` (`additionalFields.role`), and
  `server/src/routes/users.ts` (`Role.agent` on create, `Role.admin` checks
  on delete). Likewise `import { TicketCategory, TicketStatus } from
  '@prisma/client'` mirrors `enum TicketCategory { generalQuestion
  technicalQuestion refundRequest }` and `enum TicketStatus { open resolved
  closed }` from the same schema.
- Client: `@prisma/client` is server-only (it isn't, and shouldn't be, a
  `client` dependency — its generated code isn't meant for a browser
  bundle), so `core/src/constants/role.ts`, `core/src/constants/
  ticket-category.ts`, and `core/src/constants/ticket-status.ts` each define
  a small framework-agnostic mirror as a real TypeScript `enum` (`export enum
  Role { admin = 'admin', agent = 'agent' }`, same shape for the other two),
  re-exported from `core/src/index.ts`. A genuine `enum` works here even
  though `client/tsconfig.app.json` sets `erasableSyntaxOnly: true` (which
  normally forbids non-erasable syntax like enums) — that flag only applies
  to files under the client's own `include` (`client/src`), not to an
  imported workspace package's `.ts` source, so `core`'s enums typecheck fine
  when imported. Import it the same way as the zod schemas — `import { Role
  } from 'core'` — see `client/src/components/AdminRoute.tsx`,
  `client/src/components/NavBar.tsx`,
  `client/src/components/DeleteUserDialog.tsx`, and
  `client/src/components/UsersTable.tsx` (the `User['role']` type itself is
  `Role`, not `'admin' | 'agent'`). `TicketCategory`/`TicketStatus` have no
  consumers yet — they're there for the future Ticket UI/API (Phase 4).
- These are two separate declarations per enum (Prisma can't be avoided
  server-side; `core` can't depend on Prisma), so if a role, ticket category,
  or ticket status is ever added or renamed in `schema.prisma`, update the
  matching `core/src/constants/*.ts` file by hand — nothing enforces they
  stay in sync automatically.

### User deletion is a soft delete

`DELETE /api/users/:id` in `server/src/routes/users.ts` never removes the
row — it sets `User.deletedAt` (nullable `DateTime` in
`server/prisma/schema.prisma`) and immediately revokes the user's active
sessions via `ctx.internalAdapter.deleteUserSessions(id)`. `GET /api/users`
filters `where: { deletedAt: null }` so deleted users just disappear from
the admin list. Deleting a user with `role: Role.admin` 403s — this is checked
against the *target* user's role, not the requester's (`requireAdmin`
already covers the requester). Client-side, `DeleteUserDialog.tsx` also
hides its trigger entirely for admin rows, so the 403 path is a defense in
depth, not the primary guard.

Two things this deliberately does **not** do (out of scope until a real need
shows up): a deleted user isn't blocked from signing back in — better-auth's
own sign-in flow doesn't know about `deletedAt` — and `User.email`'s
`@@unique` constraint means a deleted user's email stays taken, so nobody
can register a new account with it. Fixing either would mean adopting
better-auth's `admin` plugin (built-in ban/session-revocation, but a bigger
integration change) or a partial unique index, respectively.

### Email ingestion

`POST /api/emails/inbound` (`server/src/routes/emails.ts`) turns an inbound
support email into a `Ticket` row (`server/prisma/schema.prisma`). This is
deliberately ahead of `implementation-plan.md`'s own sequencing — Phase 4
(Ticket CRUD) and Phase 5 (AI Features) haven't been built, so this is just
enough to persist a ticket, not the full CRUD/UI:

- No real email provider (SendGrid/Mailgun — `tech-stack.md` leaves this
  undecided) is wired up. The endpoint accepts a plain, provider-agnostic
  JSON body validated by `createTicketSchema` (`core/src/schemas/ticket.ts`
  — `senderEmail`, `senderName`, `subject`, `body`) instead of any one
  vendor's webhook payload shape. When a provider is chosen, translate its
  payload into this same shape rather than changing the ticket-creation
  logic itself.
- Auth is `requireWebhookSecret` (`server/src/middleware/
  require-webhook-secret.ts`), comparing an `x-webhook-secret` header
  against `process.env.EMAIL_WEBHOOK_SECRET` — a placeholder for real
  provider signature verification (SendGrid/Mailgun each sign their webhooks
  differently), since there's no specific provider to verify against yet.
  Rate-limited the same way `/api/auth` is (`server/src/middleware/
  email-limiter.ts`'s `emailWebhookLimiter`, applied only in production —
  see the `authLimiter` precedent in `server/index.ts`).
- `Ticket.category` is nullable with **no default** — there's no AI
  classification yet (Phase 5) to assign one, so it stays `null` until that
  exists. `Ticket.status` defaults to `open`. Unlike `User` (whose `id` is a
  string assigned by better-auth), `Ticket` has no external ID owner, so it
  uses Prisma's own auto-incrementing integer `id`.
- `Ticket.assignedToId`/`assignedTo` is a nullable `@relation` to `User`
  (mirrored by `User.assignedTickets`), added ahead of the assignment
  feature itself (Phase 4) — every email-ingested ticket has it `null` at
  creation; nothing sets it yet.
- Partial idempotency: before creating a ticket, `emails.ts` checks for an
  existing one with the same `senderEmail` + `subject` + `body`
  (`prisma.ticket.findFirst`) and returns that instead (`200`, not `201`) if
  found — this catches a retried webhook delivery resending the identical
  email. It does **not** catch near-duplicates (e.g. a provider that
  slightly mutates the body on retry) since there's no provider message-id
  in this provider-agnostic payload to dedupe on instead, and the
  check-then-create isn't atomic (a narrow race window exists under truly
  concurrent duplicate requests).

### Ticket list

`GET /api/tickets` (`server/src/routes/tickets.ts`) lists tickets, sorted
server-side — this is the one piece of Phase 4 (Ticket CRUD) that exists so
far, alongside the ticket creation that already happens via
[Email ingestion](#email-ingestion). No detail/update/delete/assign endpoints
yet.

- Unlike `/api/users`, this is gated by `requireAuth` only, **not**
  `requireAdmin` — per `project-scope.md`, agents (not just admins) need to
  view tickets. `client/src/pages/TicketsPage.tsx` /
  `client/src/components/TicketsTable.tsx` follow the same pattern as
  `UsersPage`/`UsersTable`, and the `/tickets` route in `App.tsx` sits
  directly under `ProtectedRoute` rather than nested inside `AdminRoute`
  (contrast `/users`). The "Tickets" link in `NavBar.tsx` is shown
  unconditionally, unlike the role-gated "Users" link.
- The list `select`s a subset of `Ticket` columns (no `body` — a list view
  doesn't need the full email text, only `server/src/routes/emails.ts`'s
  create path does) and doesn't join the `assignedTo` relation (there's no
  assignment feature yet to display).
- No create/edit/delete UI on this page — tickets are only ever created via
  email ingestion right now, so there's nothing analogous to `UserDialog`'s
  create mode here.
- **Sorting** is server-side, not client-side: `GET /api/tickets` takes
  `sortBy` (one of `subject`, `senderName`, `senderEmail`, `status`,
  `category`, `createdAt` — validated against that whitelist, falling back to
  `createdAt` for anything else) and `sortOrder` (`asc`/`desc`, falling back
  to `desc`), fed straight into Prisma's `orderBy`. `TicketsTable.tsx` uses
  **`@tanstack/react-table`** (`useReactTable`, `manualSorting: true`,
  `enableMultiSort: false`) purely as headless column/header-clicking
  plumbing — it never sorts rows itself; `sorting` (`SortingState`, one
  entry at most) lives in `useState`, drives the `useQuery` key and the
  `sortBy`/`sortOrder` params, and the server's response order is rendered
  as-is via `getCoreRowModel()` (no `getSortedRowModel()`). Column ids are
  the `Ticket` accessor keys themselves (e.g. `senderName`), so a header
  click's column id can be passed directly as `sortBy` with no extra mapping
  layer.

## Versions in use

Installed via Bun from npm, not pinned to older training-data defaults:
Express 5.x, React 19.x, Vite 8.x, TypeScript 6.x, Prisma 7.x. Confirm exact
versions in each workspace's `package.json` before assuming API shape — Prisma
7 in particular changed the generator/driver-adapter model from earlier
majors, so check context7 before assuming v5/v6-era APIs still apply.

## Testing

**Default to component tests.** They're faster, don't need the e2e test
DB/ports, and cover most of what this app needs — form validation, loading/
error/success rendering, dialog and interaction behavior, API-shape
contracts via mocked axios. Reach for an E2E test only when a component test
genuinely can't prove the thing that matters:

- real cross-page navigation or redirects (e.g. `protected-routes.spec.ts`'s
  role-gating and sign-out-clears-session checks),
- actual session/cookie behavior across real requests (not something a
  mocked `axios` can stand in for),
- an endpoint with no UI to mount at all (e.g. `e2e/emails.spec.ts` against
  the webhook — there's no component to render, so a component test isn't
  an option).

When in doubt, write the component test first and only add an E2E test if
something about the flow can't be verified that way — don't reach for E2E by
default just because a feature touches the server.

### Component tests

Client component tests use **Vitest** + **React Testing Library**, configured
in `client/vitest.config.ts` (merges the app's `vite.config.ts` via
`mergeConfig` — same React/Tailwind plugins and `@` alias, plus a jsdom test
environment).

- Run with `bun run test` — from the repo root (`--filter '*'`, runs `test`
  in every workspace that defines one, currently `client` only) or directly
  from `client/`. Either way it's `vitest run`, a single pass, not watch mode.
- Write a test file as `Component.test.tsx` **co-located** next to the
  component it covers (e.g. `client/src/components/UsersTable.test.tsx` next
  to `UsersTable.tsx`), not in a separate mirrored test tree.
- Shared test infrastructure (not tests themselves) lives in
  `client/src/test/`: `setup.ts` (jest-dom matchers, and a manual RTL
  `cleanup()` in `afterEach` — this project doesn't set `test.globals` in
  Vitest, so React Testing Library's own implicit auto-cleanup never
  registers; skipping this causes renders from earlier tests in the same file
  to leak into later ones) and `utils.tsx` (`renderWithQuery`, for mounting a
  component under a fresh `QueryClientProvider` — needed for anything using
  `useQuery`/`useMutation`, see the [Data fetching](#data-fetching) section).
- Mock `axios` per test file with `vi.mock('axios', () => ({ default: { get:
  vi.fn() } }))` rather than hitting a real server — see
  `client/src/components/UsersTable.test.tsx` for the pattern
  (pending/success/error states driven by
  `mockReturnValue`/`mockResolvedValue`/`mockRejectedValue`).

### E2E tests

Playwright-based (root `playwright.config.ts`, `e2e/` dir) with their own
isolated test database and ports — separate from normal `bun run dev`. Use
the **playwright-e2e-tester** agent to write or extend these; it already
knows the test-environment setup (test DB reset flow, dedicated ports,
Prisma's AI-consent gate on destructive commands, and this environment's
headless-browser-hang quirk), so don't duplicate that context here — see
`.claude/agents/playwright-e2e-tester.md` for the details. Keep new E2E
coverage scoped to the cases described above, rather than mirroring
everything a component test already covers.

## Not yet implemented

Ticket detail/update/delete/assign/filtering (see [Ticket list](#ticket-list)
and [Email ingestion](#email-ingestion) for what does exist: a sorted list
and creating a bare `Ticket` row from an inbound email), AI features (Claude
API), a real email provider, dashboard, Docker — see
`implementation-plan.md` for the phase breakdown.
