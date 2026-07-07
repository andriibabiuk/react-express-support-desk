import { z } from 'zod';

export const createReplySchema = z.object({
	body: z.string().min(1, 'Reply body cannot be empty'),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

export interface TicketReply {
	id: number;
	body: string;
	bodyHtml: string | null;
	author: { id: string; name: string; email: string } | null;
	createdAt: string;
}

export const polishReplySchema = z.object({
	body: z.string().min(1, 'Reply body cannot be empty'),
});

export type PolishReplyInput = z.infer<typeof polishReplySchema>;

export interface PolishReplyResponse {
	body: string;
}
