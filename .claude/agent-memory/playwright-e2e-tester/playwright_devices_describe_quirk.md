---
name: playwright-devices-describe-quirk
description: test.use with a Playwright device preset (e.g. devices['iPhone 13']) fails inside test.describe in this repo's Playwright version
metadata:
  type: project
---

`test.use({ ...devices['iPhone 13'] })` cannot be called inside a `test.describe()` block — it throws `Cannot use({ defaultBrowserType }) in a describe group, because it forces a new worker. Make it top-level in the test file or put in the configuration file.` (confirmed against `@playwright/test@^1.61.1` via `playwright test --list`, 2026-07-02).

**Why**: device presets like `iPhone 13` bundle `defaultBrowserType: 'webkit'` along with viewport/UA/touch settings. `defaultBrowserType`/`browserName`/`channel`/`launchOptions` are worker-scoped options — Playwright only allows setting those at the top level of a spec file (applies to the whole file) or in `playwright.config.ts` (as a `projects` entry), never nested inside a `describe`.

**How to apply**: give any test needing a device preset its own file with `test.use({ ...devices[...] })` as a top-level statement (not inside `describe`), e.g. `e2e/login-mobile.spec.ts`. If only viewport/UA/touch matters (not actually switching browser engine), spread just those fields instead of the whole preset — that subset *is* safe to set via `test.use()` inside a `describe`, since it doesn't touch worker-scoped options.

Also noted while running `bunx playwright test --list` here: `dotenv@^17.4.2` prints an unsolicited promotional "tip" line to stdout (`// tip: ⌁ auth for agents [www.vestauth.com]`) when `playwright.config.ts` calls `dotenv.config()`. This is dotenv's own known "tips" console-noise behavior in v17-era releases, not anything in this codebase — harmless, but worth filtering out of captured output rather than mistaking it for something else.
