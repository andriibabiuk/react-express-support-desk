---
name: authenticated-request-fixture-no-browser
description: Sign in via POST /api/auth/sign-in/email through the `request` fixture itself to get an authenticated APIRequestContext with no page/browser fixture
metadata:
  type: project
---

For a route that's behind `requireAuth` (session cookie) but has no UI to
drive — e.g. `GET /api/tickets/:id`, `GET /api/tickets/:id/replies` — you can
still avoid launching a browser (see [[playwright_headless_hangs]]) by
signing in directly through the `request` fixture instead of `loginPage`:

```ts
async function signInAsAgent(request: APIRequestContext): Promise<void> {
	const response = await request.post('/api/auth/sign-in/email', {
		data: { email: AGENT_CREDENTIALS.email, password: AGENT_CREDENTIALS.password },
	});
	expect(response.ok()).toBeTruthy();
}
```

Confirmed via Playwright's own api-testing docs (context7,
`/microsoft/playwright`): any `APIRequestContext` — whether obtained from a
`BrowserContext` or a standalone one like the `request` fixture — maintains
its own cookie jar and automatically replays `Set-Cookie` values from prior
responses on later requests made with the same context. So one `signInAsAgent(request)`
call at the top of a test is enough; every subsequent `request.get(...)`/`.post(...)`
in that same test carries the session cookie with no extra header wiring.
Confirmed working end-to-end against real `GET /api/tickets`/`GET /api/tickets/:id/replies`
calls in `e2e/emails.spec.ts`'s "AI auto-resolve" describe block.

**Why:** extends [[request_fixture_no_ui_endpoints]] — that memory covers
*unauthenticated* no-UI endpoints; this covers the authenticated case, which
otherwise looks like it would force you into a `page`-based
`loginAsAgent(loginPage)` flow (and thus the headless-Chromium hang) even
though the endpoint itself still has no UI.

**How to apply:** before reaching for a Page Object/browser fixture on an
authenticated no-UI endpoint, sign in through `request.post('/api/auth/sign-in/email', ...)`
first, then make the rest of the test's calls through that same `request`
object.

**Slow-polling gotcha:** if the thing you're waiting on involves a real
background job + real LLM call (e.g. `autoResolveTicket`'s pg-boss job +
Gemini round-trip), use `expect.poll(callback, { timeout, intervals, message })`
(confirmed valid signature via context7) and raise the test's own default
30s timeout with `test.setTimeout(90_000)` *before* awaiting the poll — the
poll's own `timeout` option is separate from, and doesn't extend, the test's
overall timeout. In practice this settled in ~4-7s per ticket against the
real Gemini flash model, well under a 90s budget.
