import { z } from 'zod';

export const createTicketSchema = z.object({
	senderEmail: z.email('Enter a valid email address'),
	senderName: z.string().trim().min(1, 'Sender name is required'),
	subject: z.string().trim().min(1, 'Subject is required'),
	body: z.string().trim().min(1, 'Body is required'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
