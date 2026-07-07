export const TicketStatus = {
	// Transient states owned by the auto-resolve pg-boss job (see
	// `server/src/lib/auto-resolve-ticket.ts`) — a ticket passes through
	// these right after arrival and never sits in them for long. Agents
	// can't set a ticket to either by hand (see `statusFilterValues` in
	// `core/src/schemas/ticket.ts`), and `GET /api/tickets` hides tickets
	// still in one of these from the list.
	new: 'new',
	processing: 'processing',
	open: 'open',
	resolved: 'resolved',
	closed: 'closed',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const STATUS_LABEL: Record<TicketStatus, string> = {
	[TicketStatus.new]: 'New',
	[TicketStatus.processing]: 'Processing',
	[TicketStatus.open]: 'Open',
	[TicketStatus.resolved]: 'Resolved',
	[TicketStatus.closed]: 'Closed',
};

export const STATUS_BADGE_VARIANT: Record<
	TicketStatus,
	'default' | 'secondary' | 'outline'
> = {
	[TicketStatus.new]: 'outline',
	[TicketStatus.processing]: 'outline',
	[TicketStatus.open]: 'default',
	[TicketStatus.resolved]: 'secondary',
	[TicketStatus.closed]: 'outline',
};
