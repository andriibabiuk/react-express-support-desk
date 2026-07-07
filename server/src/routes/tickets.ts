import { Router } from 'express';
import { ticketListQuerySchema } from 'core';
import { prisma } from '../lib/prisma.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const ticketsRouter = Router();

ticketsRouter.get('/', requireAuth, async (req, res) => {
	const { sortBy, sortOrder, status, category, search } = ticketListQuerySchema.parse(req.query);

	const tickets = await prisma.ticket.findMany({
		select: {
			id: true,
			subject: true,
			senderEmail: true,
			senderName: true,
			status: true,
			category: true,
			createdAt: true,
		},
		where: {
			...(status && { status }),
			...(category && { category: category === 'uncategorized' ? null : category }),
			...(search && {
				OR: [
					{ subject: { contains: search, mode: 'insensitive' } },
					{ senderName: { contains: search, mode: 'insensitive' } },
					{ senderEmail: { contains: search, mode: 'insensitive' } },
				],
			}),
		},
		orderBy: { [sortBy]: sortOrder },
	});
	res.json({ tickets });
});
