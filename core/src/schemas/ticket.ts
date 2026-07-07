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

// Plain string-literal unions (not the `TicketStatus`/`TicketCategory` enums
// from `core/src/constants`) so the parsed query's type lines up structurally
// with Prisma's own generated enum types (also plain string-literal unions
// under `@prisma/client`, not real `enum`s) with no cast needed where
// `server/src/routes/tickets.ts` feeds this straight into a `where` clause.
export const statusFilterValues = ['open', 'resolved', 'closed'] as const;
export type TicketStatusFilter = (typeof statusFilterValues)[number];

// `'uncategorized'` is a synthetic value (not a real `TicketCategory`)
// standing in for `category: null` — tickets not yet AI-classified.
export const categoryFilterValues = [
	'generalQuestion',
	'technicalQuestion',
	'refundRequest',
	'uncategorized',
] as const;
export type TicketCategoryFilter = (typeof categoryFilterValues)[number];

export const ticketListQuerySchema = z.object({
	sortBy: z.enum(sortableColumns).catch('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).catch('desc'),
	status: z.enum(statusFilterValues).optional().catch(undefined),
	category: z.enum(categoryFilterValues).optional().catch(undefined),
	// Free-text match against subject/senderName/senderEmail (see
	// `server/src/routes/tickets.ts`) — trimmed and blanked out to `undefined`
	// so an empty search box doesn't turn into a `contains: ''` filter (which
	// would match everything anyway, but skipping it entirely keeps the
	// no-search-term request identical to the pre-search-box shape).
	search: z
		.string()
		.trim()
		.optional()
		.catch(undefined)
		.transform(value => (value ? value : undefined)),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
