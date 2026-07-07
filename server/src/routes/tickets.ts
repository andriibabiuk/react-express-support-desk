import { Router } from 'express';
import { ticketListQuerySchema } from 'core';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const ticketsRouter = Router();

ticketsRouter.get('/', requireAuth, async (req, res) => {
	const { sortBy, sortOrder, status, category, search, page, pageSize } = ticketListQuerySchema.parse(
		req.query,
	);

	const where: Prisma.TicketWhereInput = {
		...(status && { status }),
		...(category && { category: category === 'uncategorized' ? null : category }),
		...(search && {
			OR: [
				{ subject: { contains: search, mode: 'insensitive' } },
				{ senderName: { contains: search, mode: 'insensitive' } },
				{ senderEmail: { contains: search, mode: 'insensitive' } },
			],
		}),
	};

	const [tickets, total] = await Promise.all([
		prisma.ticket.findMany({
			select: {
				id: true,
				subject: true,
				senderEmail: true,
				senderName: true,
				status: true,
				category: true,
				createdAt: true,
			},
			where,
			orderBy: { [sortBy]: sortOrder },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		prisma.ticket.count({ where }),
	]);

	res.json({
		tickets,
		pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
	});
});
