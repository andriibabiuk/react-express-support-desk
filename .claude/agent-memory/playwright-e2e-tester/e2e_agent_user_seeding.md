---
name: e2e-agent-user-seeding
description: How a second, agent-role test user got added to the e2e test DB for role-gating coverage
metadata:
  type: project
---

`server/prisma/seed.ts` (the app's real dev/prod seed script) intentionally seeds only one admin user — that's documented behavior in `CLAUDE.md`, not something to change. But e2e role-gating tests (AdminRoute redirect, NavBar "Users" link visibility) need an agent-role account too.

**Decision**: added `server/prisma/seed-e2e-agent.ts`, a near-identical copy of `seed.ts`'s `auth.$context.internalAdapter` pattern but creating a `Role.agent` user from `SEED_AGENT_EMAIL`/`SEED_AGENT_PASSWORD` env vars. Wired into `e2e/reset-test-db.ts` as a third `execSync` call (after `prisma migrate reset --force` and `prisma/seed.ts`), so `bun run test:e2e` seeds both users automatically. Added `SEED_AGENT_EMAIL`/`SEED_AGENT_PASSWORD` (default `agent@example.com` / `password123`) to both `server/.env.test` and `server/.env.test.example`.

**Why this shape, not alternatives**: kept it a separate script (not a flag/branch inside `seed.ts`) so the app's real seed script stays exactly as documented, and the e2e-only concern is scoped entirely to `e2e/` + a second small `prisma/` script that's obviously test-only by name.

**How to apply**: if a future task needs more e2e-only fixture data (more users, sample tickets, etc.), extend `e2e/reset-test-db.ts`'s chain of `execSync` calls the same way rather than touching `prisma/seed.ts`.

Since this touches `prisma migrate reset --force` (destructive, requires human consent per this repo's rules — see the E2E test environment section of `.claude/agents/playwright-e2e-tester.md`), the actual DB reset + reseed was never run by the agent in the 2026-07-02 session that added this — only fixture-less checks (`tsc --noEmit`, `playwright test --list`) were run. The user needs to run `bun run test:e2e` themselves at least once to pick up the new agent-user seed before the role-gating tests will pass.
