---
name: e2e-pom-structure
description: Where the Page Object Model classes and shared test fixtures live for this repo's e2e suite
metadata:
  type: reference
---

Page objects live in `e2e/pages/*.ts`, one class per page/major component, matching the pattern established for the auth flow:

- `e2e/pages/LoginPage.ts`, `HomePage.ts`, `UsersPage.ts` — one per route in `client/src/App.tsx`.
- `e2e/pages/NavBar.ts` — a small composed component object (not a full page) since `NavBar` is rendered by `ProtectedRoute` on every authenticated page; `HomePage`/`UsersPage` each hold a `navBar: NavBar` property rather than duplicating its locators.
- `e2e/fixtures.ts` — custom `test` (via `base.extend`) that auto-instantiates `loginPage`/`homePage`/`usersPage` fixtures, plus exported `ADMIN_CREDENTIALS` / `AGENT_CREDENTIALS` constants read from `process.env` (populated by `playwright.config.ts`'s `dotenv.config()` of `server/.env.test`, with fallbacks matching `.env.test.example`). All spec files import `{ test, expect }` from `./fixtures`, not `@playwright/test` directly.
- `e2e/tsconfig.json` — added so `e2e/**/*.ts` type-checks in strict mode (needed a root `@types/node` devDependency too; it wasn't hoisted by Bun's isolated linker since only `client/` declared it before).

Tests authenticate via real UI login in each test body (`loginPage.goto()` + `loginPage.login(email, password)`), not `storageState` reuse — matches the "real backend interactions, realistic user behavior" standard and keeps each test isolated without a shared auth setup project.

See also [[e2e_agent_user_seeding]] and [[e2e_shadcn_field_error_locators]].
