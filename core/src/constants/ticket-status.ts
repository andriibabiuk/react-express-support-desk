export enum TicketStatus {
	open = 'open',
	resolved = 'resolved',
	closed = 'closed',
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
	[TicketStatus.open]: 'Open',
	[TicketStatus.resolved]: 'Resolved',
	[TicketStatus.closed]: 'Closed',
};

export const STATUS_BADGE_VARIANT: Record<
	TicketStatus,
	'default' | 'secondary' | 'outline'
> = {
	[TicketStatus.open]: 'default',
	[TicketStatus.resolved]: 'secondary',
	[TicketStatus.closed]: 'outline',
};
