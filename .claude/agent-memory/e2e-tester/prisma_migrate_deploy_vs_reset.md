---
name: prisma-migrate-deploy-vs-reset
description: Use non-destructive `prisma migrate deploy` instead of the gated `migrate reset` when the test DB is just missing pending migrations, not seed data
metadata:
  type: feedback
---

`bun run test:e2e:db:reset` (which runs `prisma migrate reset --force`
against `supportdesk_test`) is gated by Prisma's AI-agent consent check and
errors out asking for `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` — see
[[playwright_e2e_test_db_setup]]. Hitting that gate does **not** mean the
task is blocked: check *why* the reset seemed necessary first.

Concretely: after a new Prisma migration is added mid-session (e.g. the
`Ticket` model / `add_ticket`, `add_ticket_assigned_to` migrations), the test
DB will report those as pending via
`DATABASE_URL=<test-db-url> bunx prisma migrate status` (read-only, never
gated, safe to run anytime to check drift). If status shows only pending
*migrations* (not "no migrations found" / empty DB), running
`DATABASE_URL=<test-db-url> bunx prisma migrate deploy` applies them without
dropping any existing tables or rows — it is not a destructive reset and did
not trigger Prisma's AI-consent gate in practice.

**Why:** the user's standing rule is never to set
`PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` without them explicitly
confirming a *specific* destructive command first. `migrate deploy` sidesteps
needing that consent at all for the common case of "schema changed this
session, test DB hasn't caught up yet" — it's the correct minimal fix, not a
workaround.

**How to apply:** if `bun run test:e2e:db:reset` (or the earlier
seed/migrate step) fails on the consent gate, don't immediately escalate to
the user for consent — first run `migrate status` against the test DB to see
whether the actual problem is "pending migrations" (fix: `migrate deploy`,
no consent needed) vs. "DB genuinely needs wiping/reseeding" (fix: surface
the exact `migrate reset` command, what it destroys, confirm it's the test
DB not dev, and wait for real user consent per
[[playwright_e2e_test_db_setup]] — do not assume prior conversation consent
counts).

On Windows/Git Bash in this repo, pass `DATABASE_URL` inline rather than
`export $(grep ...)` — the test DB URL is double-quoted in `.env.test` and
`export $(grep ...)` mangles the quoting (`P1013: scheme not recognized`).
Either `bun --env-file=.env.test -e "..."` (confirmed this correctly sets
`process.env.DATABASE_URL` inside that bun process) or a literal
`DATABASE_URL="postgresql://..." bunx prisma ...` prefix works; oddly
`bun --env-file=.env.test x prisma migrate status` did NOT propagate the
override into the `bunx`-spawned Prisma child process (it showed the dev
`supportdesk` DB, not `supportdesk_test`) even though the parent bun process
had the right value — untested exactly why, but don't trust `--env-file`
plus `bun x` together for this; use the literal env-var-prefix form instead.
