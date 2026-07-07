import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TicketCategory, TicketStatus } from 'core';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TicketAssigneeSelect } from '@/components/TicketAssigneeSelect';
import {
	CATEGORY_LABEL,
	formatDate,
	STATUS_BADGE_VARIANT,
	STATUS_LABEL,
} from '@/components/TicketsTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TicketDetail {
	id: number;
	subject: string;
	body: string;
	senderEmail: string;
	senderName: string;
	status: TicketStatus;
	category: TicketCategory | null;
	createdAt: string;
	updatedAt: string;
	assignedTo: { id: string; name: string; email: string } | null;
}

export function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();

	const { data: ticket, isPending, isError, error } = useQuery({
		queryKey: ['ticket', id],
		queryFn: () => axios.get(`/api/tickets/${id}`).then(res => res.data as TicketDetail),
		retry: false,
	});

	const notFound = axios.isAxiosError(error) && error.response?.status === 404;

	return (
		<main className='flex-1 p-6'>
			<Link
				to='/tickets'
				className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
			>
				<ArrowLeft className='size-3.5' />
				Back to tickets
			</Link>

			{isPending && (
				<Card className='mt-4 max-w-2xl'>
					<CardHeader>
						<Skeleton className='h-6 w-64' />
					</CardHeader>
					<CardContent className='space-y-3'>
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-2/3' />
					</CardContent>
				</Card>
			)}

			{isError && notFound && <p className='mt-4 text-sm text-muted-foreground'>Ticket not found.</p>}
			{isError && !notFound && (
				<p className='mt-4 text-sm text-destructive'>Failed to load ticket.</p>
			)}

			{ticket && (
				<Card className='mt-4 max-w-2xl'>
					<CardHeader>
						<CardTitle className='text-xl'>{ticket.subject}</CardTitle>
						<div className='mt-2 flex items-center gap-2'>
							<Badge variant={STATUS_BADGE_VARIANT[ticket.status]}>
								{STATUS_LABEL[ticket.status]}
							</Badge>
							{ticket.category ? (
								<Badge variant='secondary'>{CATEGORY_LABEL[ticket.category]}</Badge>
							) : (
								<Badge variant='outline'>Uncategorized</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent className='space-y-4'>
						<dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
							<dt className='text-muted-foreground'>From</dt>
							<dd>
								{ticket.senderName} &lt;{ticket.senderEmail}&gt;
							</dd>
							<dt className='text-muted-foreground'>Assigned to</dt>
							<dd>
								<TicketAssigneeSelect
									ticketId={ticket.id}
									assignedToId={ticket.assignedTo?.id ?? null}
								/>
							</dd>
							<dt className='text-muted-foreground'>Created</dt>
							<dd>{formatDate(ticket.createdAt)}</dd>
							<dt className='text-muted-foreground'>Updated</dt>
							<dd>{formatDate(ticket.updatedAt)}</dd>
						</dl>
						<div className='border-t border-border pt-4 whitespace-pre-wrap'>{ticket.body}</div>
					</CardContent>
				</Card>
			)}
		</main>
	);
}
