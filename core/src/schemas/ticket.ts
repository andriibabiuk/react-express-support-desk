import { z } from 'zod';

export const createTicketSchema = z.object({
	senderEmail: z.email('Enter a valid email address'),
	senderName: z.string().trim().min(1, 'Sender name is required'),
	subject: z.string().trim().min(1, 'Subject is required'),
	body: z.string().trim().min(1, 'Body is required'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const sortableColumns = ['subject', 'senderName', 'status', 'category', 'createdAt'] as const;
export type TicketSortField = (typeof sortableColumns)[number];

export const ticketListQuerySchema = z.object({
	sortBy: z.enum(sortableColumns).catch('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).catch('desc'),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
