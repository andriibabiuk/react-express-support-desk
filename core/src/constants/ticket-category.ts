export const TicketCategory = {
	generalQuestion: 'generalQuestion',
	technicalQuestion: 'technicalQuestion',
	refundRequest: 'refundRequest',
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
	[TicketCategory.generalQuestion]: 'General Question',
	[TicketCategory.technicalQuestion]: 'Technical Question',
	[TicketCategory.refundRequest]: 'Refund Request',
};
