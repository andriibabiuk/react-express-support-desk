import { Router } from 'express';
import { assignTicketSchema, ticketListQuerySchema } from 'core';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const ticketsRouter = Router();

// Must come before `/:id` — otherwise Express would match `assignees` as an
// `:id` value and route it to that handler instead.
ticketsRouter.get('/assignees', requireAuth, async (_req, res) => {
	const assignees = await prisma.user.findMany({
		where: { role: Role.agent, deletedAt: null },
		select: { id: true, name: true, email: true },
		orderBy: { name: 'asc' },
	});
	res.json({ assignees });
});

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

ticketsRouter.get('/:id', requireAuth, async (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		res.status(400).json({ error: 'Invalid ticket id' });
		return;
	}

	const ticket = await prisma.ticket.findUnique({
		where: { id },
		include: { assignedTo: { select: { id: true, name: true, email: true } } },
	});

	if (!ticket) {
		res.status(404).json({ error: 'Ticket not found' });
		return;
	}

	res.json(ticket);
});

ticketsRouter.patch('/:id', requireAuth, async (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		res.status(400).json({ error: 'Invalid ticket id' });
		return;
	}

	const parsed = assignTicketSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: z.prettifyError(parsed.error) });
		return;
	}
	const { assignedToId } = parsed.data;

	if (assignedToId) {
		const assignee = await prisma.user.findUnique({
			where: { id: assignedToId },
			select: { role: true, deletedAt: true },
		});
		if (!assignee || assignee.deletedAt || assignee.role !== Role.agent) {
			res.status(400).json({ error: 'Ticket can only be assigned to an active agent' });
			return;
		}
	}

	try {
		const ticket = await prisma.ticket.update({
			where: { id },
			data: { assignedToId },
			include: { assignedTo: { select: { id: true, name: true, email: true } } },
		});
		res.json(ticket);
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
			res.status(404).json({ error: 'Ticket not found' });
			return;
		}
		throw error;
	}
});
