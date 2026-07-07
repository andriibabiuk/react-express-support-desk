import { expect, test } from './fixtures';

// playwright.config.ts loads server/.env.test into process.env before workers
// start, same pattern as ADMIN_CREDENTIALS/AGENT_CREDENTIALS in fixtures.ts.
// Falls back to the documented .env.test.example placeholder so the "wrong
// secret" tests still make sense (a mismatched string) even if the real env
// var somehow isn't inherited by a worker process.
const WEBHOOK_SECRET =
	process.env.EMAIL_WEBHOOK_SECRET ?? 'generate-a-separate-secret-with-openssl-rand-base64-32';

// This endpoint has no UI (no page ever calls it) and isn't behind
// requireAuth, so these tests use Playwright's `request` fixture directly
// instead of a Page Object or loginAsAdmin/loginAsAgent — no browser is
// launched, which also sidesteps this environment's headless-Chromium hang.
test.describe('POST /api/emails/inbound', () => {
	function validPayload(subject: string) {
		return {
			senderEmail: 'customer@example.com',
			senderName: 'Jane Customer',
			subject,
			body: 'My widget stopped working after the last update.',
		};
	}

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

	test('creates a new ticket and returns 201 with status "open" and null category/assignedToId', async ({
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
			status: 'open',
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
