import { SenderType, TicketStatus, type Ticket } from '@prisma/client';
import { generateObject } from 'ai';
import type { Job } from 'pg-boss';
import { z } from 'zod';
import { ticketAutoResolveModel } from './ai.ts';
import { boss } from './boss.ts';
import { knowledgeBase } from './knowledge-base.ts';
import { prisma } from './prisma.ts';
import { textToHtml } from './text-to-html.ts';

export const AUTO_RESOLVE_TICKET_QUEUE = 'auto-resolve-ticket';

interface AutoResolveTicketJobData {
	id: number;
	subject: string;
	body: string;
	senderName: string;
}

// Enqueued as a pg-boss job for the same reason as `classifyTicket` — so
// ticket creation doesn't wait on the Gemini round-trip, and a transient
// failure gets retried instead of leaving the ticket stuck unresolved.
export function autoResolveTicket(ticket: Ticket): void {
	const data: AutoResolveTicketJobData = {
		id: ticket.id,
		subject: ticket.subject,
		body: ticket.body,
		senderName: ticket.senderName,
	};
	boss.send(AUTO_RESOLVE_TICKET_QUEUE, data).catch(error => {
		console.error(
			`Failed to enqueue auto-resolution for ticket ${ticket.id}:`,
			error,
		);
	});
}

const autoResolutionSchema = z.object({
	resolvable: z
		.boolean()
		.describe(
			'True only if the knowledge base directly and confidently answers ' +
				"this ticket without needing a human agent's judgment.",
		),
	reply: z
		.string()
		.optional()
		.describe(
			'A complete, ready-to-send reply to the customer. Set only when resolvable is true.',
		),
});

async function autoResolveTicketJob(
	jobs: Job<AutoResolveTicketJobData>[],
): Promise<void> {
	const [job] = jobs;
	if (!job) return;
	const { id, subject, body, senderName } = job.data;

	await prisma.ticket.update({
		where: { id },
		data: { status: TicketStatus.processing },
	});

	const { object } = await generateObject({
		model: ticketAutoResolveModel,
		schema: autoResolutionSchema,
		system:
			'You triage incoming customer support tickets against the company ' +
			"knowledge base below. Mark a ticket `resolvable` only if the " +
			"knowledge base directly and unambiguously answers the customer's " +
			'question — never guess or answer from general knowledge. Follow ' +
			"the knowledge base's own escalation rules exactly: if the ticket " +
			'threatens legal action, requests a refund outside the 30-day ' +
			'window, disputes a charge or mentions a chargeback, involves ' +
			'account security concerns, or you are otherwise not fully ' +
			'confident, mark it not resolvable so a human agent handles it ' +
			'instead. When resolvable, write the reply grounded only in the ' +
			"knowledge base content — open with a brief greeting to the " +
			'customer by name and close with a brief sign-off from "Support ' +
			'Team".\n\n' +
			`Knowledge base:\n${knowledgeBase}`,
		prompt: `Ticket subject: ${subject}\nCustomer's name: ${senderName}\n\nTicket body: ${body}`,
	});

	if (object.resolvable && object.reply) {
		await prisma.$transaction([
			prisma.ticketReply.create({
				data: {
					body: object.reply,
					bodyHtml: textToHtml(object.reply),
					senderType: SenderType.ai,
					ticketId: id,
				},
			}),
			prisma.ticket.update({
				where: { id },
				data: { status: TicketStatus.resolved },
			}),
		]);
	} else {
		await prisma.ticket.update({
			where: { id },
			data: { status: TicketStatus.open },
		});
	}
}

// Called once at server startup (see `index.ts`) to create the queue and
// start polling it — must run after `boss.start()`.
export async function registerAutoResolveTicketWorker(): Promise<void> {
	await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);
	await boss.work<AutoResolveTicketJobData>(
		AUTO_RESOLVE_TICKET_QUEUE,
		autoResolveTicketJob,
	);
}
