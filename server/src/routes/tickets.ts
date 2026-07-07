import { Prisma, Role, SenderType, TicketStatus } from '@prisma/client';
import { generateText } from 'ai';
import { ticketListQuerySchema, updateTicketSchema } from 'core';
import { Router } from 'express';
import { z } from 'zod';
import { ticketSummaryModel } from '../lib/ai.ts';
import { prisma } from '../lib/prisma.ts';
import { repliesRouter } from './replies.ts';

export const ticketsRouter = Router();

// Must come before `/:id` — otherwise Express would match `assignees` as an
// `:id` value and route it to that handler instead.
ticketsRouter.get('/assignees', async (_req, res) => {
	const assignees = await prisma.user.findMany({
		where: { role: Role.agent, deletedAt: null },
		select: { id: true, name: true, email: true },
		orderBy: { name: 'asc' },
	});
	res.json({ assignees });
});

ticketsRouter.get('/', async (req, res) => {
	const { sortBy, sortOrder, status, category, search, page, pageSize } =
		ticketListQuerySchema.parse(req.query);

	const where: Prisma.TicketWhereInput = {
		// While a ticket is `new`/`processing` the auto-resolve job (see
		// `server/src/lib/auto-resolve-ticket.ts`) hasn't settled it into a
		// state an agent should act on yet, so it's hidden from the list
		// entirely — even the explicit status filter below can't reach it,
		// since `statusFilterValues` in `core` only covers the settled states.
		status: status ?? { notIn: [TicketStatus.new, TicketStatus.processing] },
		...(category && {
			category: category === 'uncategorized' ? null : category,
		}),
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
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.max(1, Math.ceil(total / pageSize)),
		},
	});
});

ticketsRouter.get('/:id', async (req, res) => {
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

ticketsRouter.post('/:id/summary', async (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		res.status(400).json({ error: 'Invalid ticket id' });
		return;
	}

	const ticket = await prisma.ticket.findUnique({
		where: { id },
		select: { subject: true, body: true, senderName: true },
	});
	if (!ticket) {
		res.status(404).json({ error: 'Ticket not found' });
		return;
	}

	const replies = await prisma.ticketReply.findMany({
		where: { ticketId: id },
		select: {
			body: true,
			senderType: true,
			author: { select: { name: true } },
		},
		orderBy: { createdAt: 'asc' },
	});

	const conversation = replies
		.map(reply => {
			const speaker =
				reply.senderType === SenderType.agent
					? (reply.author?.name ?? 'Agent')
					: ticket.senderName;
			return `${speaker}: ${reply.body}`;
		})
		.join('\n\n');

	const { text } = await generateText({
		model: ticketSummaryModel,
		system:
			'You summarize customer support tickets for agents. Write a concise ' +
			"summary (2-4 sentences) covering the customer's issue and the " +
			'current state of the conversation, including any resolution or ' +
			'next steps discussed. Respond with only the summary text — no ' +
			'preamble, headings, or bullet points.',
		prompt:
			`Ticket subject: ${ticket.subject}\n` +
			`Customer's name: ${ticket.senderName}\n` +
			`Customer's original message: ${ticket.body}\n\n` +
			(conversation
				? `Conversation so far:\n${conversation}`
				: 'No replies yet.'),
	});

	res.json({ summary: text.trim() });
});

ticketsRouter.use('/:id/replies', repliesRouter);

ticketsRouter.patch('/:id', async (req, res) => {
	const id = Number(req.params.id);
	if (!Number.isInteger(id)) {
		res.status(400).json({ error: 'Invalid ticket id' });
		return;
	}

	const parsed = updateTicketSchema.safeParse(req.body);
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
			res
				.status(400)
				.json({ error: 'Ticket can only be assigned to an active agent' });
			return;
		}
	}

	try {
		const ticket = await prisma.ticket.update({
			where: { id },
			data: parsed.data,
			include: {
				assignedTo: { select: { id: true, name: true, email: true } },
			},
		});
		res.json(ticket);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2025'
		) {
			res.status(404).json({ error: 'Ticket not found' });
			return;
		}
		throw error;
	}
});
