import { SenderType } from '@prisma/client';
import { createReplySchema } from 'core';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
const router = Router({ mergeParams: true });

function textToHtml(text: string): string {
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	return escaped.replace(/\n/g, '<br>');
}

router.get<{ id: string }>('/', async (req, res, next) => {
	try {
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
	} catch (err) {
		next(err);
	}
});

router.post<{ id: string }>('/', async (req, res, next) => {
	try {
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
	} catch (err) {
		next(err);
	}
});

export const repliesRouter = router;
