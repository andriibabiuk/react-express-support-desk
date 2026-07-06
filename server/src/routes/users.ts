import { Role } from '@prisma/client';
import { createUserSchema } from 'core';
import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../lib/auth.ts';
import { prisma } from '../lib/prisma.ts';
import { requireAdmin } from '../middleware/require-admin.ts';
import { requireAuth } from '../middleware/require-auth.ts';

export const usersRouter = Router();

usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
	const users = await prisma.user.findMany({
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
