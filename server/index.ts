import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { auth } from './src/lib/auth.ts';
import { registerAutoResolveTicketWorker } from './src/lib/auto-resolve-ticket.ts';
import { boss } from './src/lib/boss.ts';
import { registerClassifyTicketWorker } from './src/lib/classify-ticket.ts';
import { prisma } from './src/lib/prisma.ts';
import { authLimiter } from './src/middleware/auth-limiter.ts';
import { emailWebhookLimiter } from './src/middleware/email-limiter.ts';
import { requireAuth } from './src/middleware/require-auth.ts';
import { emailsRouter } from './src/routes/emails.ts';
import { ticketsRouter } from './src/routes/tickets.ts';
import { usersRouter } from './src/routes/users.ts';
const app = express();
const port = process.env.PORT ?? 4000;

app.use(
	helmet({
		crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
		referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
	}),
);
app.use(
	cors({
		origin: process.env.CLIENT_URL,
		credentials: true,
	}),
);

const authMiddleware =
	process.env.NODE_ENV === 'production' ? [authLimiter] : [];
const emailWebhookMiddleware =
	process.env.NODE_ENV === 'production' ? [emailWebhookLimiter] : [];

app.use(express.json());

app.all('/api/auth/{*any}', ...authMiddleware, (req, res, next) =>
	toNodeHandler(auth)(req, res).catch(next),
);

app.get('/api/health', async (_req, res) => {
	await prisma.$queryRaw`SELECT 1`;
	res.json({ status: 'ok', db: 'connected' });
});
app.get('/api/me', requireAuth, (req, res) => {
	const { id, name, email, role } = req.user;
	res.json({ user: { id, name, email, role } });
});
app.use('/api/users', usersRouter);
app.use('/api/tickets', requireAuth, ticketsRouter);
app.use('/api/emails', ...emailWebhookMiddleware, emailsRouter);

await boss.start();
await registerClassifyTicketWorker();
await registerAutoResolveTicketWorker();

app.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
});
