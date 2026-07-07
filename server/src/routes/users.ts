import { Role } from '@prisma/client';
import { createUserSchema, updateUserSchema } from 'core';
import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../lib/auth.ts';
import { prisma } from '../lib/prisma.ts';
import { requireAdmin } from '../middleware/require-admin.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const usersRouter = Router();

usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
	const users = await prisma.user.findMany({
		where: { deletedAt: null },
		select: { id: true, name: true, email: true, role: true, createdAt: true },
		orderBy: { createdAt: 'asc' },
	});
	res.json({ users });
});

usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
	const parsed = createUserSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: z.prettifyError(parsed.error) });
		return;
	}
	const { name, email, password } = parsed.data;

	const ctx = await auth.$context;

	const existing = await ctx.internalAdapter.findUserByEmail(email);
	if (existing) {
		res.status(409).json({ error: 'A user with this email already exists.' });
		return;
	}

	const user = await ctx.internalAdapter.createUser({
		email,
		name,
		emailVerified: true,
		role: Role.agent,
	});

	const hashedPassword = await ctx.password.hash(password);
	await ctx.internalAdapter.linkAccount({
		accountId: user.id,
		providerId: 'credential',
		password: hashedPassword,
		userId: user.id,
	});

	res.status(201).json({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt,
		},
	});
});

usersRouter.patch<{ id: string }>('/:id', requireAuth, requireAdmin, async (req, res) => {
	const parsed = updateUserSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: z.prettifyError(parsed.error) });
		return;
	}
	const { id } = req.params;
	const { name, email, password } = parsed.data;

	const ctx = await auth.$context;

	const existingUser = await ctx.internalAdapter.findUserById(id);
	if (!existingUser) {
		res.status(404).json({ error: 'User not found.' });
		return;
	}

	const emailOwner = await ctx.internalAdapter.findUserByEmail(email);
	if (emailOwner && emailOwner.user.id !== id) {
		res.status(409).json({ error: 'A user with this email already exists.' });
		return;
	}

	const user = await ctx.internalAdapter.updateUser(id, { name, email });

	if (password) {
		const hashedPassword = await ctx.password.hash(password);
		await ctx.internalAdapter.updatePassword(id, hashedPassword);
	}

	res.json({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt,
		},
	});
});

usersRouter.delete<{ id: string }>('/:id', requireAuth, requireAdmin, async (req, res) => {
	const { id } = req.params;

	const existingUser = await prisma.user.findUnique({
		where: { id },
		select: { role: true, deletedAt: true },
	});
	if (!existingUser || existingUser.deletedAt) {
		res.status(404).json({ error: 'User not found.' });
		return;
	}

	if (existingUser.role === Role.admin) {
		res.status(403).json({ error: 'Admin users cannot be deleted.' });
		return;
	}

	await prisma.$transaction([
		prisma.user.update({
			where: { id },
			data: { deletedAt: new Date() },
		}),
		prisma.ticket.updateMany({
			where: { assignedToId: id },
			data: { assignedToId: null },
		}),
	]);

	const ctx = await auth.$context;
	await ctx.internalAdapter.deleteUserSessions(id);

	res.status(204).send();
});
