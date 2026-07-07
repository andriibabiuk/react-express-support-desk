import { BadgeSelect, type BadgeSelectOption } from '@/components/BadgeSelect';
import { TicketAssigneeSelect } from '@/components/TicketAssigneeSelect';
import { formatDate } from '@/components/TicketsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
	CATEGORY_LABEL,
	STATUS_BADGE_VARIANT,
	STATUS_LABEL,
	TicketCategory,
	TicketStatus,
	type Ticket,
	type UpdateTicketInput,
} from 'core';

async function updateTicket({
	id,
	...data
}: { id: number } & UpdateTicketInput) {
	const res = await axios.patch(`/api/tickets/${id}`, data);
	return res.data as Ticket;
}

const STATUS_SELECT_OPTIONS: BadgeSelectOption<TicketStatus>[] = Object.values(
	TicketStatus,
).map(status => ({
	value: status,
	label: STATUS_LABEL[status],
	badgeVariant: STATUS_BADGE_VARIANT[status],
}));

type CategorySelectValue = TicketCategory | 'uncategorized';
const UNCATEGORIZED = 'uncategorized' satisfies CategorySelectValue;

const CATEGORY_SELECT_OPTIONS: BadgeSelectOption<CategorySelectValue>[] = [
	{ value: UNCATEGORIZED, label: 'Uncategorized', badgeVariant: 'outline' },
	...Object.values(TicketCategory).map(category => ({
		value: category as CategorySelectValue,
		label: CATEGORY_LABEL[category],
		badgeVariant: 'secondary' as const,
	})),
];

export function UpdateTicket({
	ticketId,
	status,
	category,
	assignedTo,
	updatedAt,
}: {
	ticketId: number;
} & Pick<Ticket, 'status' | 'category' | 'assignedTo' | 'updatedAt'>) {
	const queryClient = useQueryClient();

	const { mutate: updateTicketMutate } = useMutation({
		mutationFn: updateTicket,
		onSuccess: updatedTicket => {
			queryClient.setQueryData(['tickets', ticketId], updatedTicket);
			// Refresh the ticket list (it shows status/category) without refetching
			// this ticket's own detail/replies queries — setQueryData above already
			// made the detail cache fresh, and nothing here touched replies.
			queryClient.invalidateQueries({
				predicate: query => query.queryKey[0] === 'tickets' && query.queryKey[1] !== ticketId,
			});
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Details</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				<dl className='grid grid-cols-2 gap-x-4 gap-y-3 text-sm'>
					<dt className='text-muted-foreground'>Status</dt>
					<dd>
						<BadgeSelect
							value={status}
							options={STATUS_SELECT_OPTIONS}
							onValueChange={status => updateTicketMutate({ id: ticketId, status })}
						/>
					</dd>
					<dt className='text-muted-foreground'>Category</dt>
					<dd>
						<BadgeSelect
							value={category ?? UNCATEGORIZED}
							options={CATEGORY_SELECT_OPTIONS}
							onValueChange={category =>
								updateTicketMutate({
									id: ticketId,
									category: category === UNCATEGORIZED ? null : category,
								})
							}
						/>
					</dd>
					<dt className='text-muted-foreground'>Assigned to</dt>
					<dd>
						<TicketAssigneeSelect ticketId={ticketId} assignedToId={assignedTo?.id ?? null} />
					</dd>
					<dt className='text-muted-foreground'>Updated</dt>
					<dd>{formatDate(updatedAt)}</dd>
				</dl>
			</CardContent>
		</Card>
	);
}
