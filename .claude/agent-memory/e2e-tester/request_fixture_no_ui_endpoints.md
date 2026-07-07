---
name: request-fixture-no-ui-endpoints
description: Use Playwright's request fixture (no Page Object) for API-only endpoints with no UI, e.g. POST /api/emails/inbound webhook
metadata:
  type: project
---

`POST /api/emails/inbound` (`server/src/routes/emails.ts`) is a pure JSON
webhook endpoint (meant for SendGrid/Mailgun, not yet wired up) with **no UI**
anywhere in the app and **no `requireAuth`** — it's gated only by
`requireWebhookSecret` (`server/src/middleware/require-webhook-secret.ts`,
checks `x-webhook-secret` header against `process.env.EMAIL_WEBHOOK_SECRET`).

Tests live in `e2e/emails.spec.ts`, written entirely with the `request`
fixture from `./fixtures` (which re-exports base Playwright `test`/`expect`,
so `request` is available same as it already was in `e2e/login.spec.ts`'s
"rejects sign-up at the API level" test) — no `page`/`browser`/`context`
fixture, no Page Object, no `loginAsAdmin`/`loginAsAgent`. This matters
because fixture-less-of-a-browser tests (no `page`/`browser`/`context` param)
don't launch Chromium at all, so they **actually run** in this Windows
sandbox instead of hanging on the known headless-Chromium
`--remote-debugging-pipe` handshake issue (see
[[playwright_headless_hangs]]) — confirmed: all 5 tests passed for real,
twice in a row with `--repeat-each=2`.

**Why:** any endpoint with zero UI and zero session requirement is a
strong signal to skip Page Objects/browser fixtures entirely and go
straight to `request` — it's both more appropriate (nothing user-facing to
model) and a way to get genuine pass/fail signal in an environment where
browser-based specs can only be reasoned about, not executed.

**How to apply:** before reaching for a Page Object, check whether the
target route is mounted in `server/index.ts` behind `requireAuth` and
whether any client page/component actually calls it. If neither, use the
`request` fixture pattern from `e2e/emails.spec.ts` as the template.

**Test data / duplicate-detection gotcha:** this endpoint does
`prisma.ticket.findFirst({ where: { senderEmail, subject, body } })` before
creating — an exact match returns the *existing* ticket with 200 instead of
creating a new one. Every test that expects a *new* ticket (201) must use a
unique `subject` (e.g. `` `E2E ... ${Date.now()}` ``) or it'll silently hit
the 200 path instead when the suite reruns. There's no delete-ticket
endpoint yet, so cleanup relies entirely on the project's existing
`bun run test:e2e:db:reset` step between full suite runs, not anything
per-test.

**zod message gotcha (generalizes beyond this endpoint):** a schema like
`z.string().trim().min(1, 'Subject is required')` only emits that custom
message when the field is present as a string but empty/whitespace. If the
key is omitted from the JSON body entirely, zod's type check fails first
with a generic `"Invalid input: expected string, received undefined"`
message instead — the custom `.min()` message never runs. When testing a
"required field" validation message, send an empty/whitespace string for
that field, not an omitted key, or the assertion will fail against real
(correct) app behavior, not a bug.
