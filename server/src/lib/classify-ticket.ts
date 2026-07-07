import type { Ticket } from '@prisma/client';
import { generateObject } from 'ai';
import { TicketCategory } from 'core';
import { z } from 'zod';
import { ticketClassificationModel } from './ai.ts';
import { prisma } from './prisma.ts';

// Fire-and-forget: callers don't await this, so a new ticket is created (and
// the request responded to) without waiting on the Gemini round-trip. Errors
// are swallowed here rather than propagated, since there's no request left to
// fail by the time this settles — an unclassified ticket just stays `null`,
// same as before this feature existed.
export function classifyTicket(ticket: Ticket): void {
	generateObject({
		model: ticketClassificationModel,
		schema: z.object({ category: z.enum(TicketCategory) }),
		system:
			'You classify incoming customer support tickets into exactly one ' +
			'category based on their subject and body: `generalQuestion` for ' +
			'general questions, `technicalQuestion` for technical issues or ' +
			'bugs, and `refundRequest` for refund or billing disputes.',
		prompt: `Ticket subject: ${ticket.subject}\n\nTicket body: ${ticket.body}`,
	})
		.then(({ object }) =>
			prisma.ticket.update({
				where: { id: ticket.id },
				data: { category: object.category },
			}),
		)
		.catch(error => {
			console.error(`Failed to classify ticket ${ticket.id}:`, error);
		});
}
