import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import helmet from 'helmet';
import { auth } from './src/lib/auth.ts';
import { prisma } from './src/lib/prisma.ts';
import { authLimiter } from './src/middleware/auth-limiter.ts';
import { requireAdmin } from './src/middleware/require-admin.ts';
import { requireAuth } from './src/middleware/require-auth.ts';

const app = express();
const port = process.env.PORT ?? 4000;

app.use(helmet());

const authMiddleware =
	process.env.NODE_ENV === 'production' ? [authLimiter] : [];

app.all('/api/auth/{*any}', ...authMiddleware, (req, res, next) =>
	toNodeHandler(auth)(req, res).catch(next),
);

app.use(express.json());

app.get('/api/health', async (_req, res) => {
	await prisma.$queryRaw`SELECT 1`;
	res.json({ status: 'ok', db: 'connected' });
});
app.get('/api/me', requireAuth, (req, res) => {
	const { id, name, email, role } = req.user;
	res.json({ user: { id, name, email, role } });
});
app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
	const users = await prisma.user.findMany({
		select: { id: true, name: true, email: true, role: true },
		orderBy: { createdAt: 'asc' },
	});
	res.json({ users });
});

app.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
});
