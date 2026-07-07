import type { Ticket } from '@prisma/client';
import { generateObject } from 'ai';
import { TicketCategory } from 'core';
import type { Job } from 'pg-boss';
import { z } from 'zod';
import { ticketClassificationModel } from './ai.ts';
import { boss } from './boss.ts';
import { prisma } from './prisma.ts';

export const CLASSIFY_TICKET_QUEUE = 'classify-ticket';

interface ClassifyTicketJobData {
	id: number;
	subject: string;
	body: string;
}

// Enqueues classification as a pg-boss job rather than running it inline, so
// a new ticket is created (and the request responded to) without waiting on
// the Gemini round-trip — and, unlike a bare fire-and-forget promise, a
// transient failure gets retried by pg-boss instead of leaving the ticket
// unclassified for good.
export function classifyTicket(ticket: Ticket): void {
	const data: ClassifyTicketJobData = {
		id: ticket.id,
		subject: ticket.subject,
		body: ticket.body,
	};
	boss.send(CLASSIFY_TICKET_QUEUE, data).catch(error => {
		console.error(
			`Failed to enqueue classification for ticket ${ticket.id}:`,
			error,
		);
	});
}

async function classifyTicketJob(
	jobs: Job<ClassifyTicketJobData>[],
): Promise<void> {
	const [job] = jobs;
	if (!job) return;
	const { id, subject, body } = job.data;

	const { object } = await generateObject({
		model: ticketClassificationModel,
		schema: z.object({ category: z.enum(TicketCategory) }),
		system:
			'You classify incoming customer support tickets into exactly one ' +
			'category based on their subject and body: `generalQuestion` for ' +
			'general questions, `technicalQuestion` for technical issues or ' +
			'bugs, and `refundRequest` for refund or billing disputes.',
		prompt: `Ticket subject: ${subject}\n\nTicket body: ${body}`,
	});

	await prisma.ticket.update({
		where: { id },
		data: { category: object.category },
	});
}

// Called once at server startup (see `index.ts`) to create the queue and
// start polling it — must run after `boss.start()`.
export async function registerClassifyTicketWorker(): Promise<void> {
	await boss.createQueue(CLASSIFY_TICKET_QUEUE);
	await boss.work<ClassifyTicketJobData>(
		CLASSIFY_TICKET_QUEUE,
		classifyTicketJob,
	);
}
