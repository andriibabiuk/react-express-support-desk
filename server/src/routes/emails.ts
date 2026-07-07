import { createTicketSchema } from 'core';
import { Router } from 'express';
import { z } from 'zod';
import { getAiAgentId } from '../lib/ai-agent.ts';
import { autoResolveTicket } from '../lib/auto-resolve-ticket.ts';
import { classifyTicket } from '../lib/classify-ticket.ts';
import { prisma } from '../lib/prisma.ts';
import { requireWebhookSecret } from '../middleware/require-webhook-secret.ts';

export const emailsRouter = Router();

emailsRouter.post('/inbound', requireWebhookSecret, async (req, res) => {
	const parsed = createTicketSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: z.prettifyError(parsed.error) });
		return;
	}

	const { senderEmail, senderName, subject, body } = parsed.data;

	// Guards against a retried webhook delivery (or the same sender emailing
	// in the exact same subject/body twice) creating a duplicate ticket.
	const existingTicket = await prisma.ticket.findFirst({
		where: { senderEmail, subject, body },
	});
	if (existingTicket) {
		res.status(200).json({ ticket: existingTicket });
		return;
	}

	const ticket = await prisma.ticket.create({
		data: {
			subject,
			body,
			senderEmail,
			senderName,
			// Every new ticket starts out assigned to the AI agent while the
			// auto-resolve job (`autoResolveTicket` below) works it — see
			// `server/src/lib/ai-agent.ts`.
			assignedToId: await getAiAgentId(),
		},
	});

	classifyTicket(ticket);
	autoResolveTicket(ticket);

	res.status(201).json({ ticket });
});
