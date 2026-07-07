import { Router } from 'express';
import { ticketListQuerySchema } from 'core';
import { prisma } from '../lib/prisma.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const ticketsRouter = Router();

ticketsRouter.get('/', requireAuth, async (req, res) => {
	const { sortBy, sortOrder } = ticketListQuerySchema.parse(req.query);

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
		orderBy: { [sortBy]: sortOrder },
	});
	res.json({ tickets });
});
