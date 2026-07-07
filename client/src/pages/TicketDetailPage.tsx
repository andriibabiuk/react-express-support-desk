import { BackLink } from '@/components/BackLink';
import { TicketDetail } from '@/components/TicketDetail';
import { TicketDetailSkeleton } from '@/components/TicketDetailSkeleton';
import { TicketReplies } from '@/components/TicketReplies';
import { TicketReplyForm } from '@/components/TicketReplyForm';
import { UpdateTicket } from '@/components/UpdateTicket';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { Ticket } from 'core';
import { useParams } from 'react-router-dom';

export function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();
	const ticketId = Number(id);

	const {
		data: ticket,
		isPending,
		isError,
		error,
	} = useQuery({
		queryKey: ['tickets', ticketId],
		queryFn: () =>
			axios
				.get(`/api/tickets/${ticketId}`)
				.then(res => res.data as Ticket),
		retry: false,
		enabled: !isNaN(ticketId),
	});

	const notFound = axios.isAxiosError(error) && error.response?.status === 404;

	return (
		<main className='flex-1 p-6'>
			<BackLink to='/tickets' label='Back to tickets' />

			{isPending && <TicketDetailSkeleton />}

			{isError && notFound && (
				<p className='mt-4 text-sm text-muted-foreground'>Ticket not found.</p>
			)}
			{isError && !notFound && (
				<p className='mt-4 text-sm text-destructive'>Failed to load ticket.</p>
			)}

			{ticket && (
				<div className='mt-4 grid grid-cols-1 gap-6 md:grid-cols-3'>
					<div className='md:col-span-2'>
						<TicketDetail
							subject={ticket.subject}
							senderName={ticket.senderName}
							senderEmail={ticket.senderEmail}
							createdAt={ticket.createdAt}
							body={ticket.body}
						/>
						<TicketReplies ticketId={ticketId} />
						<TicketReplyForm ticketId={ticketId} />
					</div>
					<div className='space-y-4'>
						<UpdateTicket
							ticketId={ticketId}
							status={ticket.status}
							category={ticket.category}
							assignedTo={ticket.assignedTo}
							updatedAt={ticket.updatedAt}
						/>
					</div>
				</div>
			)}
		</main>
	);
}
