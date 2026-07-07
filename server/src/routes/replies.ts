import { SenderType } from '@prisma/client';
import { generateText } from 'ai';
import { createReplySchema, polishReplySchema } from 'core';
import { Router } from 'express';
import { z } from 'zod';
import { replyPolishModel } from '../lib/ai';
import { prisma } from '../lib/prisma';
import { textToHtml } from '../lib/text-to-html';
const router = Router({ mergeParams: true });

router.get<{ id: string }>('/', async (req, res, next) => {
	const ticketId = Number(req.params.id);
	if (!Number.isInteger(ticketId)) {
		return res.status(400).json({ error: 'Invalid ticket id' });
	}

	const replies = await prisma.ticketReply.findMany({
		where: { ticketId },
		include: { author: { select: { id: true, name: true, email: true } } },
		orderBy: { createdAt: 'asc' },
	});

	res.json({ replies });
});

router.post<{ id: string }>('/polish', async (req, res, next) => {
	const ticketId = Number(req.params.id);
	if (!Number.isInteger(ticketId)) {
		return res.status(400).json({ error: 'Invalid ticket id' });
	}

	const validation = polishReplySchema.safeParse(req.body);
	if (!validation.success) {
		return res.status(400).json({ error: z.prettifyError(validation.error) });
	}

	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId },
		select: { subject: true, body: true, senderName: true },
	});
	if (!ticket) {
		return res.status(404).json({ error: 'Ticket not found' });
	}

	const { text } = await generateText({
		model: replyPolishModel,
		system:
			'You polish draft replies written by a customer support agent. ' +
			'Improve clarity, grammar, and tone while preserving the original ' +
			'meaning and any specific details (names, order numbers, links, etc). ' +
			'Keep it concise and professional. Open the reply with a brief greeting ' +
			"addressing the customer by their first name, and end it with a brief " +
			"sign-off on its own line using the agent's name (e.g. \"Best,\\n<name>\"), " +
			'replacing any greeting or sign-off already in the draft. Respond with ' +
			'only the polished reply text — no preamble, explanation, or surrounding ' +
			'quotes.',
		prompt:
			`Ticket subject: ${ticket.subject}\n` +
			`Customer's name: ${ticket.senderName}\n` +
			`Customer's message: ${ticket.body}\n\n` +
			`Agent's name: ${req.user.name}\n\n` +
			`Agent's draft reply to polish:\n${validation.data.body}`,
	});

	res.json({ body: text.trim() });
});

router.post<{ id: string }>('/', async (req, res, next) => {
	const ticketId = Number(req.params.id);
	if (!Number.isInteger(ticketId)) {
		return res.status(400).json({ error: 'Invalid ticket id' });
	}

	const validation = createReplySchema.safeParse(req.body);
	if (!validation.success) {
		return res.status(400).json({ error: z.prettifyError(validation.error) });
	}

	const newReply = await prisma.ticketReply.create({
		data: {
			...validation.data,
			bodyHtml: textToHtml(validation.data.body),
			ticketId,
			authorId: req.user.id,
			senderType: SenderType.agent,
		},
		include: { author: { select: { id: true, name: true, email: true } } },
	});

	res.status(201).json(newReply);
});

export const repliesRouter = router;
