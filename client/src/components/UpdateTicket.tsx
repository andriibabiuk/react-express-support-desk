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
	statusFilterValues,
	TicketCategory,
	TicketStatus,
	type Ticket,
	type TicketStatusFilter,
	type UpdateTicketInput,
} from 'core';

async function updateTicket({
	id,
	...data
}: { id: number } & UpdateTicketInput) {
	const res = await axios.patch(`/api/tickets/${id}`, data);
	return res.data as Ticket;
}

// `statusFilterValues` (`open`/`resolved`/`closed`) deliberately excludes
// `new`/`processing` — those are internal states driven by the auto-resolve
// job (see `server/src/lib/auto-resolve-ticket.ts`), not something an agent
// sets by hand.
// `resolved` gets its own green accent class — the shared `secondary` badge
// variant reads as neutral gray, but a resolved ticket is a distinct signal
// from "not yet categorized" secondary badges elsewhere.
const STATUS_ACCENT_CLASS: Partial<Record<TicketStatus, string>> = {
	[TicketStatus.resolved]: 'bg-status-resolved/15 text-status-resolved border-status-resolved/30',
};

const STATUS_SELECT_OPTIONS: BadgeSelectOption<TicketStatusFilter>[] =
	statusFilterValues.map(status => ({
		value: status,
		label: STATUS_LABEL[status as TicketStatus],
		badgeVariant: STATUS_BADGE_VARIANT[status as TicketStatus],
		badgeClassName: STATUS_ACCENT_CLASS[status as TicketStatus],
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
							value={status as TicketStatusFilter}
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
