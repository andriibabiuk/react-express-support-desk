import { TicketCategory, TicketStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma.ts';

// One-off local dev data generator — populates the tickets list with enough
// volume and variety (status, category, uncategorized, sender, and spread-out
// createdAt) to actually see sorting/filtering do something. Not wired into
// `bun run seed` (which only ever provisions the one real admin user) or the
// e2e test DB reset — run by hand via `bun run seed:tickets` against a local
// dev DB.
const TICKET_COUNT = 100;

interface TicketTemplate {
	category: TicketCategory;
	subject: string;
	body: string;
}

const GENERAL_QUESTIONS: TicketTemplate[] = [
	{
		category: TicketCategory.generalQuestion,
		subject: 'How do I reset my password?',
		body: 'Hi, I forgot my password and the reset email never arrived. Can you help me regain access to my account?',
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Can I change my billing email address?',
		body: "I need to update the email address that receives our invoices. What's the process for that?",
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Where can I download my invoice?',
		body: "I need last month's invoice for our accounting records but can't find a download link anywhere.",
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Do you offer a student discount?',
		body: "I'm a full-time student and was wondering if there's a discounted plan available.",
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'How do I upgrade my plan?',
		body: "We've outgrown our current plan and would like to move to the next tier. What's involved?",
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Is there a mobile app available?',
		body: 'Is there an iOS or Android app, or is this web-only for now?',
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'What are your support hours?',
		body: 'Just checking what hours your support team is available in case I need to reach out again.',
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'How do I add a team member to my account?',
		body: "I'd like to invite a colleague to our workspace. Where do I manage seats?",
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Can I export my data to CSV?',
		body: 'Is there a way to export all of our records to a spreadsheet for a quarterly review?',
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Do you support two-factor authentication?',
		body: "For security reasons we'd like to enable 2FA on all our accounts. Is that supported?",
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'How do I cancel my subscription?',
		body: 'We no longer need the service and would like to cancel before the next billing cycle.',
	},
	{
		category: TicketCategory.generalQuestion,
		subject: 'Can I change my company name on the account?',
		body: 'We recently rebranded and need our account name updated to match.',
	},
];

const TECHNICAL_QUESTIONS: TicketTemplate[] = [
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Getting a 500 error when uploading files',
		body: 'Every time I try to upload a file larger than a few MB I get a server error. Smaller files work fine.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'API requests are timing out intermittently',
		body: 'Our integration has started seeing sporadic timeouts on the /v1/records endpoint over the past two days.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: "Webhook events aren't being delivered",
		body: "We haven't received any webhook events since yesterday afternoon even though activity is happening in the dashboard.",
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Login page shows a blank screen in Safari',
		body: 'The login page loads fine in Chrome but shows a completely blank white screen in Safari on macOS.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Integration with Slack stopped working after the last update',
		body: 'Our Slack notifications stopped coming through right after your latest release. Everything was fine before that.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: "Getting 'invalid token' error on every request",
		body: "All of our API calls started failing with an invalid token error this morning, even though we haven't rotated any keys.",
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: "Dashboard charts aren't loading any data",
		body: "The analytics dashboard shows empty charts for the last week, even though there's clearly activity in the account.",
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'SSO login redirects to an error page',
		body: 'When our employees try to log in via SSO they get redirected to a generic error page instead of the dashboard.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Bulk export feature times out for large datasets',
		body: 'Exporting more than about 10,000 rows always times out before finishing.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: "Notifications aren't being sent to our webhook URL",
		body: "We updated our webhook URL last week and haven't gotten a single event since.",
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Search results are missing recently added items',
		body: "Anything added in the last 24 hours doesn't show up in search, even though it's visible in the list view.",
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Mobile app crashes when opening the settings screen',
		body: 'The app crashes every single time I tap on Settings, on both of my devices.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: "Two-factor authentication codes aren't arriving",
		body: "I enabled 2FA and now the SMS codes never arrive, so I'm locked out.",
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: "Can't upload files over 5MB",
		body: 'Larger attachments just silently fail with no error message.',
	},
	{
		category: TicketCategory.technicalQuestion,
		subject: 'Password reset link expired immediately',
		body: 'The reset link I received said it had already expired within seconds of clicking it.',
	},
];

const REFUND_REQUESTS: TicketTemplate[] = [
	{
		category: TicketCategory.refundRequest,
		subject: "Requesting a refund for last month's charge",
		body: 'I was charged for last month even though I cancelled two weeks before the renewal date.',
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Accidentally purchased the annual plan instead of monthly',
		body: 'I meant to select monthly billing but was charged for the full year by mistake.',
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Please cancel my subscription and refund the last payment',
		body: "I'd like to cancel immediately and get a refund for this month since we never actually used the service.",
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Charged twice for the same invoice',
		body: 'Our card was charged twice for invoice #4471 - can you refund the duplicate charge?',
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Refund request - cancelled service but still billed',
		body: 'I cancelled last month but was billed again today. Please refund and confirm the cancellation went through.',
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Overcharged after downgrading my plan',
		body: 'I downgraded my plan two weeks ago but was still billed at the old higher rate.',
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Would like a refund for the unused portion of my subscription',
		body: "We're closing our office and won't be using the remaining 8 months on our annual plan. Is a partial refund possible?",
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Billed for a feature I never enabled',
		body: "There's a line item on my invoice for an add-on I never turned on.",
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Refund needed - trial converted to paid without notice',
		body: "My free trial converted to a paid plan without any warning email, and I'd like that charge refunded.",
	},
	{
		category: TicketCategory.refundRequest,
		subject: 'Double billed after updating my card',
		body: 'I updated my payment method and it looks like both the old and new card were charged this cycle.',
	},
];

const TEMPLATES = [...GENERAL_QUESTIONS, ...TECHNICAL_QUESTIONS, ...REFUND_REQUESTS];

interface Sender {
	name: string;
	email: string;
}

const SENDERS: Sender[] = [
	{ name: 'Maria Gomez', email: 'maria.gomez@example.com' },
	{ name: 'John Doe', email: 'john.doe@example.com' },
	{ name: 'Sarah Chen', email: 'sarah.chen@northgate.io' },
	{ name: 'Ahmed Hassan', email: 'ahmed.hassan@deltaworks.com' },
	{ name: 'Priya Patel', email: 'priya.patel@brightlane.co' },
	{ name: 'Tom Richardson', email: 'tom.richardson@outlook.com' },
	{ name: 'Emily Turner', email: 'emily.turner@gmail.com' },
	{ name: "Liam O'Brien", email: 'liam.obrien@fernhill.com' },
	{ name: 'Sofia Rossi', email: 'sofia.rossi@icloud.com' },
	{ name: 'Kenji Nakamura', email: 'kenji.nakamura@yahoo.co.jp' },
	{ name: 'Grace Kim', email: 'grace.kim@pixelforge.com' },
	{ name: 'David Cohen', email: 'david.cohen@gmail.com' },
	{ name: 'Olivia Martin', email: 'olivia.martin@hotmail.com' },
	{ name: 'Carlos Mendez', email: 'carlos.mendez@vertexlabs.io' },
	{ name: 'Natasha Ivanova', email: 'natasha.ivanova@yandex.com' },
	{ name: 'Ben Foster', email: 'ben.foster@outlook.com' },
	{ name: 'Hannah Wright', email: 'hannah.wright@gmail.com' },
	{ name: 'Yusuf Demir', email: 'yusuf.demir@aydinsoft.com' },
	{ name: 'Chloe Bennett', email: 'chloe.bennett@icloud.com' },
	{ name: 'Marcus Johnson', email: 'marcus.johnson@gmail.com' },
	{ name: 'Isabella Rodriguez', email: 'isabella.rodriguez@outlook.com' },
	{ name: 'Noah Williams', email: 'noah.williams@gmail.com' },
	{ name: 'Amelia Clarke', email: 'amelia.clarke@brightlane.co' },
	{ name: 'Ravi Shankar', email: 'ravi.shankar@deltaworks.com' },
	{ name: 'Zoe Anderson', email: 'zoe.anderson@gmail.com' },
	{ name: 'Ethan Brooks', email: 'ethan.brooks@fernhill.com' },
	{ name: 'Mia Lawson', email: 'mia.lawson@yahoo.com' },
	{ name: 'Lucas Silva', email: 'lucas.silva@vertexlabs.io' },
	{ name: 'Aisha Khan', email: 'aisha.khan@outlook.com' },
	{ name: 'Daniel Park', email: 'daniel.park@pixelforge.com' },
	{ name: 'Ella Fitzgerald', email: 'ella.fitzgerald@icloud.com' },
	{ name: 'Samuel Green', email: 'samuel.green@gmail.com' },
	{ name: 'Nina Petrova', email: 'nina.petrova@yandex.com' },
	{ name: 'Oscar Diaz', email: 'oscar.diaz@northgate.io' },
	{ name: 'Fatima Al-Sayed', email: 'fatima.alsayed@aydinsoft.com' },
	{ name: 'Jack Thompson', email: 'jack.thompson@outlook.com' },
	{ name: 'Ruby Evans', email: 'ruby.evans@gmail.com' },
	{ name: 'Henry Walker', email: 'henry.walker@fernhill.com' },
	{ name: 'Layla Ahmed', email: 'layla.ahmed@brightlane.co' },
	{ name: 'Mason Reed', email: 'mason.reed@gmail.com' },
];

// Roughly half categorized-and-triaged, half still sitting in the inbox
// exactly as it arrives via email ingestion today (category: null).
const UNCATEGORIZED_RATE = 0.3;
const DAYS_OF_HISTORY = 90;

function pickRandom<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)]!;
}

function pickStatus(): TicketStatus {
	const roll = Math.random();
	if (roll < 0.45) return TicketStatus.open;
	if (roll < 0.8) return TicketStatus.resolved;
	return TicketStatus.closed;
}

function randomCreatedAt(): Date {
	const msAgo = Math.random() * DAYS_OF_HISTORY * 24 * 60 * 60 * 1000;
	return new Date(Date.now() - msAgo);
}

async function main() {
	const tickets = Array.from({ length: TICKET_COUNT }, () => {
		const template = pickRandom(TEMPLATES);
		const sender = pickRandom(SENDERS);
		const category = Math.random() < UNCATEGORIZED_RATE ? null : template.category;

		return {
			subject: template.subject,
			body: template.body,
			senderName: sender.name,
			senderEmail: sender.email,
			category,
			status: pickStatus(),
			createdAt: randomCreatedAt(),
		};
	});

	const { count } = await prisma.ticket.createMany({ data: tickets });
	console.log(`Created ${count} tickets.`);
}

main()
	.then(() => process.exit(0))
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
