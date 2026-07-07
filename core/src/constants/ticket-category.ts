export enum TicketCategory {
	generalQuestion = 'generalQuestion',
	technicalQuestion = 'technicalQuestion',
	refundRequest = 'refundRequest',
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
	[TicketCategory.generalQuestion]: 'General Question',
	[TicketCategory.technicalQuestion]: 'Technical Question',
	[TicketCategory.refundRequest]: 'Refund Request',
};
