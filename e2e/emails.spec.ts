import type { APIRequestContext } from '@playwright/test';
import { AGENT_CREDENTIALS, expect, test } from './fixtures';

// playwright.config.ts loads server/.env.test into process.env before workers
// start, same pattern as ADMIN_CREDENTIALS/AGENT_CREDENTIALS in fixtures.ts.
// Falls back to the documented .env.test.example placeholder so the "wrong
// secret" tests still make sense (a mismatched string) even if the real env
// var somehow isn't inherited by a worker process.
const WEBHOOK_SECRET =
	process.env.EMAIL_WEBHOOK_SECRET ?? 'generate-a-separate-secret-with-openssl-rand-base64-32';

/**
 * Signs in as the seeded agent user directly through better-auth's API — no
 * `page`/`browser` fixture involved. Playwright's `request` fixture is its
 * own `APIRequestContext` with its own cookie jar (the same mechanism a
 * `BrowserContext.request` shares with its browser, just standalone here —
 * see Playwright's api-testing docs on cookie management), so the
 * `Set-Cookie` this response gets back is stored and automatically replayed
 * on every later call made with the same `request` object in the test. Both
 * `GET /api/tickets` and `GET /api/tickets/:id` sit behind `requireAuth`
 * (`server/index.ts`), so the auto-resolve coverage below needs this before
 * it can read ticket state back.
 */
async function signInAsAgent(request: APIRequestContext): Promise<void> {
	const response = await request.post('/api/auth/sign-in/email', {
		data: { email: AGENT_CREDENTIALS.email, password: AGENT_CREDENTIALS.password },
	});
	expect(response.ok(), 'agent sign-in must succeed before authenticated ticket requests').toBeTruthy();
}

interface SettledTicket {
	id: number;
	status: string;
	category: string | null;
	subject: string;
}

/**
 * Polls `GET /api/tickets/:id` until `autoResolveTicket`
 * (`server/src/lib/auto-resolve-ticket.ts`) has moved the ticket out of
 * `new`/`processing` into a settled status (`resolved` or `open`). This
 * depends on a real pg-boss job pickup plus a real Gemini `generateObject`
 * round-trip, so it's meaningfully slower than everything else in this
 * suite — callers must raise the test's own default 30s timeout via
 * `test.setTimeout(...)` *before* awaiting this, or Playwright will fail the
 * test on its own timeout before this poll's `timeoutMs` is reached.
 */
async function waitForSettledTicket(
	request: APIRequestContext,
	ticketId: number,
	timeoutMs = 60_000,
): Promise<SettledTicket> {
	let ticket: SettledTicket | undefined;
	await expect
		.poll(
			async () => {
				const response = await request.get(`/api/tickets/${ticketId}`);
				expect(response.ok()).toBeTruthy();
				ticket = await response.json();
				return ticket!.status;
			},
			{
				timeout: timeoutMs,
				intervals: [1_000, 2_000, 3_000],
				message: `ticket ${ticketId} never settled out of new/processing within ${timeoutMs}ms`,
			},
		)
		.not.toMatch(/^(new|processing)$/);

	return ticket!;
}

// Module-scoped (not nested inside the `describe` below) since the AI
// auto-resolve `describe` block further down needs it too.
function validPayload(subject: string) {
	return {
		senderEmail: 'customer@example.com',
		senderName: 'Jane Customer',
		subject,
		body: 'My widget stopped working after the last update.',
	};
}

// This endpoint has no UI (no page ever calls it) and isn't behind
// requireAuth, so these tests use Playwright's `request` fixture directly
// instead of a Page Object or loginAsAdmin/loginAsAgent — no browser is
// launched, which also sidesteps this environment's headless-Chromium hang.
test.describe('POST /api/emails/inbound', () => {
	test('401s with no x-webhook-secret header', async ({ request }) => {
		const response = await request.post('/api/emails/inbound', {
			data: validPayload(`E2E no-secret ${Date.now()}`),
		});

		expect(response.status()).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
	});

	test('401s with a wrong x-webhook-secret header', async ({ request }) => {
		const response = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': 'definitely-not-the-secret' },
			data: validPayload(`E2E wrong-secret ${Date.now()}`),
		});

		expect(response.status()).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
	});

	test('400s on an invalid body (blank subject, malformed email)', async ({ request }) => {
		const response = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': WEBHOOK_SECRET },
			data: {
				senderEmail: 'not-an-email',
				senderName: 'Jane Customer',
				// A blank (whitespace-only) subject, not an omitted one: the schema
				// is `z.string().trim().min(1, 'Subject is required')`, so that
				// custom message only fires once the field is a string that fails
				// the min-length check. Omitting the key entirely instead trips
				// zod's earlier type check ("expected string, received undefined"),
				// which would assert an implementation detail of field absence
				// rather than the "required" validation this test means to cover.
				subject: '   ',
				body: 'My widget stopped working after the last update.',
			},
		});

		expect(response.status()).toBe(400);
		// createTicketSchema.safeParse fails on both senderEmail and subject;
		// z.prettifyError joins every issue into one string, so assert both
		// messages are present rather than the exact combined format.
		const { error } = await response.json();
		expect(error).toContain('Enter a valid email address');
		expect(error).toContain('Subject is required');
	});

	test('creates a new ticket and returns 201 with status "new" and null category/assignedToId', async ({
		request,
	}) => {
		const payload = validPayload(`E2E new ticket ${Date.now()}`);

		const response = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': WEBHOOK_SECRET },
			data: payload,
		});

		expect(response.status()).toBe(201);
		const { ticket } = await response.json();
		expect(ticket).toMatchObject({
			subject: payload.subject,
			body: payload.body,
			senderEmail: payload.senderEmail,
			senderName: payload.senderName,
			// Was `open` pre-auto-resolve; a ticket now starts `new` and only
			// reaches `open` if the auto-resolve job (see
			// `server/src/lib/auto-resolve-ticket.ts`) later escalates it — this
			// immediate response is captured before that job has run at all, so
			// it must always be the as-created default, not a settled status.
			status: 'new',
			category: null,
			assignedToId: null,
		});
		expect(ticket.id).toEqual(expect.any(Number));
	});

	test('returns the existing ticket with 200 on an exact resend (duplicate detection)', async ({
		request,
	}) => {
		const payload = validPayload(`E2E duplicate resend ${Date.now()}`);

		const first = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': WEBHOOK_SECRET },
			data: payload,
		});
		expect(first.status()).toBe(201);
		const { ticket: firstTicket } = await first.json();

		// Same senderEmail/subject/body as the first request (a retried webhook
		// delivery) should be matched by the handler's findFirst lookup and
		// return the same row instead of creating a second one.
		const second = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': WEBHOOK_SECRET },
			data: payload,
		});
		expect(second.status()).toBe(200);
		const { ticket: secondTicket } = await second.json();

		expect(secondTicket.id).toBe(firstTicket.id);
	});
});

// Coverage for the AI auto-resolve plumbing wired up in
// `server/src/lib/auto-resolve-ticket.ts`, fired (alongside the existing
// `classifyTicket` job) right after ticket creation in
// `server/src/routes/emails.ts`. This deliberately does NOT try to
// exhaustively verify the model's own triage judgment (prompt correctness,
// knowledge-base parsing) — that's not something e2e should own — it only
// checks that the status transitions (`new` -> `processing` -> `resolved`/
// `open`), the AI-authored `TicketReply` on resolution, and the ticket
// list's exclusion of unsettled tickets all work end to end against a real
// pg-boss job and a real Gemini call. Each test below triggers exactly one
// such job, since every call costs real time and money — keep it that way
// if extending this file.
test.describe('AI auto-resolve (server/src/lib/auto-resolve-ticket.ts)', () => {
	test('settles a clearly-answerable ticket out of "new"/"processing", with an AI reply once resolved, and keeps it out of the ticket list until then', async ({
		request,
	}) => {
		// Real pg-boss pickup + a real Gemini round-trip regularly takes well
		// past the default 30s test timeout.
		test.setTimeout(90_000);

		const payload = validPayload(`E2E auto-resolve refund policy ${Date.now()}`);
		// Directly answerable from server/knowledge-base.md's section 4 (Refund
		// Policy) with no escalation trigger present, so this should reliably
		// resolve rather than escalate — see `auto-resolve-ticket.ts`'s system
		// prompt for the escalation rules this deliberately avoids.
		payload.body =
			"What is your refund policy? I bought a course last week and I'm not sure if I still qualify for a refund.";

		const created = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': WEBHOOK_SECRET },
			data: payload,
		});
		expect(created.status()).toBe(201);
		const { ticket } = await created.json();
		expect(ticket.status).toBe('new');

		await signInAsAgent(request);

		// Checked immediately after creation, before the background job has had
		// any realistic chance to run (it needs a pg-boss poll cycle plus a
		// network round-trip to Gemini) — a narrow race window exists where the
		// job could settle the ticket before this request lands, which would
		// make this specific assertion moot rather than wrong, but in practice
		// a same-process follow-up request is far faster than that.
		const listWhileUnsettled = await request.get('/api/tickets', {
			params: { search: payload.subject },
		});
		expect(listWhileUnsettled.ok()).toBeTruthy();
		const { tickets: ticketsWhileUnsettled } = await listWhileUnsettled.json();
		expect(
			ticketsWhileUnsettled.find((t: { id: number }) => t.id === ticket.id),
			'a ticket still `new`/`processing` must not appear in the list',
		).toBeUndefined();

		const settled = await waitForSettledTicket(request, ticket.id);
		expect(['resolved', 'open']).toContain(settled.status);

		if (settled.status === 'resolved') {
			const repliesResponse = await request.get(`/api/tickets/${ticket.id}/replies`);
			expect(repliesResponse.ok()).toBeTruthy();
			const { replies } = await repliesResponse.json();
			const aiReply = replies.find((r: { senderType: string }) => r.senderType === 'ai');
			expect(aiReply, 'a resolved ticket must have an AI-authored reply').toBeDefined();
			expect(aiReply.body.length).toBeGreaterThan(0);
		}

		const listAfterSettling = await request.get('/api/tickets', {
			params: { search: payload.subject },
		});
		expect(listAfterSettling.ok()).toBeTruthy();
		const { tickets: ticketsAfterSettling } = await listAfterSettling.json();
		expect(
			ticketsAfterSettling.find((t: { id: number }) => t.id === ticket.id),
			'a settled ticket (resolved or open) must appear in the list again',
		).toBeDefined();
	});

	test('escalates a ticket that trips an escalation rule to "open", not "resolved", with no AI reply', async ({
		request,
	}) => {
		test.setTimeout(90_000);

		const payload = validPayload(`E2E auto-resolve escalation ${Date.now()}`);
		// Two independent escalation triggers from knowledge-base.md's section 10
		// (refund request outside the 30-day window, and a legal-action threat),
		// so this should reliably escalate rather than resolve.
		payload.body =
			'I am requesting a refund for a course I purchased 90 days ago. If this is not resolved immediately I will be consulting a lawyer about legal action against your company.';

		const created = await request.post('/api/emails/inbound', {
			headers: { 'x-webhook-secret': WEBHOOK_SECRET },
			data: payload,
		});
		expect(created.status()).toBe(201);
		const { ticket } = await created.json();

		await signInAsAgent(request);

		const settled = await waitForSettledTicket(request, ticket.id);

		// This is still a real LLM judgment call, not a deterministic branch —
		// see the flakiness note in this suite's summary — but both escalation
		// triggers here are explicit, unambiguous rules from the knowledge base
		// (not edge cases), so this should reliably land on `open`.
		expect(settled.status).toBe('open');

		const repliesResponse = await request.get(`/api/tickets/${ticket.id}/replies`);
		expect(repliesResponse.ok()).toBeTruthy();
		const { replies } = await repliesResponse.json();
		expect(
			replies.find((r: { senderType: string }) => r.senderType === 'ai'),
			'an escalated ticket must not have an AI-authored reply',
		).toBeUndefined();
	});
});
