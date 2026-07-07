import { Router } from 'express';
import { prisma } from '../lib/prisma.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const ticketsRouter = Router();

ticketsRouter.get('/', requireAuth, async (_req, res) => {
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
		orderBy: { createdAt: 'desc' },
	});
	res.json({ tickets });
});
