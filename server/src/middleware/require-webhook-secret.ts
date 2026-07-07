import type { RequestHandler } from 'express';

export const requireWebhookSecret: RequestHandler = (req, res, next) => {
	if (req.header('x-webhook-secret') !== process.env.EMAIL_WEBHOOK_SECRET) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	next();
};
