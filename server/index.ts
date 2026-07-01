import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { auth } from './src/lib/auth.ts';
import { prisma } from './src/lib/prisma.ts';
import { requireAuth } from './src/middleware/require-auth.ts';

const app = express();
const port = process.env.PORT ?? 4000;

app.all('/api/auth/{*any}', (req, res, next) =>
	toNodeHandler(auth)(req, res).catch(next),
);

app.use(express.json());

app.get('/api/health', async (_req, res) => {
	await prisma.$queryRaw`SELECT 1`;
	res.json({ status: 'ok', db: 'connected' });
});
app.get('/api/me', requireAuth, (req, res) => {
	res.json({ user: req.user, session: req.session });
});

app.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
});
