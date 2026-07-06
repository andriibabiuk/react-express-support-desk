import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';

export const requireAdmin: RequestHandler = (req, res, next) => {
	if (req.user.role !== Role.admin) {
		res.status(403).json({ error: 'Forbidden' });
		return;
	}
	next();
};
