import { TicketAssigneeSelect } from '@/components/TicketAssigneeSelect';
import { formatDate } from '@/components/TicketsTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
	CATEGORY_LABEL,
	STATUS_BADGE_VARIANT,
	STATUS_LABEL,
	statusFilterValues,
	TicketCategory,
	TicketStatus,
	type UpdateTicketInput,
} from 'core';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

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

async function updateTicket({
	id,
	...data
}: { id: number } & UpdateTicketInput) {
	const res = await axios.patch(`/api/tickets/${id}`, data);
	return res.data as TicketDetail;
}

export function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();
	const ticketId = Number(id);
	const queryClient = useQueryClient();

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
				.then(res => res.data as TicketDetail),
		retry: false,
		enabled: !isNaN(ticketId),
	});

	const { mutate } = useMutation({
		mutationFn: updateTicket,
		onSuccess: updatedTicket => {
			queryClient.setQueryData(['tickets', ticketId], updatedTicket);
			queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false });
		},
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

			{isError && notFound && (
				<p className='mt-4 text-sm text-muted-foreground'>Ticket not found.</p>
			)}
			{isError && !notFound && (
				<p className='mt-4 text-sm text-destructive'>Failed to load ticket.</p>
			)}

			{ticket && (
				<div className='mt-4 grid grid-cols-1 gap-6 md:grid-cols-3'>
					<div className='md:col-span-2'>
						<Card>
							<CardHeader>
								<CardTitle className='text-xl'>{ticket.subject}</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='whitespace-pre-wrap'>{ticket.body}</div>
							</CardContent>
						</Card>
					</div>
					<div className='space-y-4'>
						<Card>
							<CardHeader>
								<CardTitle>Details</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<dl className='grid grid-cols-2 gap-x-4 gap-y-3 text-sm'>
									<dt className='text-muted-foreground'>Status</dt>
									<dd>
										<Select
											value={ticket.status}
											onValueChange={(status: TicketStatus) =>
												mutate({ id: ticketId, status })
											}
										>
											<SelectTrigger className='h-auto w-full gap-1.5 border-none bg-transparent p-0 font-medium focus:ring-0'>
												<Badge variant={STATUS_BADGE_VARIANT[ticket.status]}>
													<SelectValue />
												</Badge>
											</SelectTrigger>
											<SelectContent>
												{statusFilterValues.map(status => (
													<SelectItem key={status} value={status}>
														{STATUS_LABEL[status]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</dd>
									<dt className='text-muted-foreground'>Category</dt>
									<dd>
										<TicketCategorySelect
											value={ticket.category}
											onValueChange={category =>
												mutate({ id: ticketId, category })
											}
										/>
									</dd>
									<dt className='text-muted-foreground'>From</dt>
									<dd className='break-all'>
										{ticket.senderName} &lt;{ticket.senderEmail}&gt;
									</dd>
									<dt className='text-muted-foreground'>Assigned to</dt>
									<dd>
										<TicketAssigneeSelect
											ticketId={ticketId}
											assignedToId={ticket.assignedTo?.id}
										/>
									</dd>
									<dt className='text-muted-foreground'>Created</dt>
									<dd>{formatDate(ticket.createdAt)}</dd>
									<dt className='text-muted-foreground'>Updated</dt>
									<dd>{formatDate(ticket.updatedAt)}</dd>
								</dl>
							</CardContent>
						</Card>
					</div>
				</div>
			)}
		</main>
	);
}

const CATEGORY_SELECT_OPTIONS = [
	{ value: 'uncategorized', label: 'Uncategorized' },
	{
		value: TicketCategory.generalQuestion,
		label: CATEGORY_LABEL.generalQuestion,
	},
	{
		value: TicketCategory.technicalQuestion,
		label: CATEGORY_LABEL.technicalQuestion,
	},
	{ value: TicketCategory.refundRequest, label: CATEGORY_LABEL.refundRequest },
];

function TicketCategorySelect({
	value,
	onValueChange,
}: {
	value: TicketCategory | null;
	onValueChange: (value: TicketCategory | null) => void;
}) {
	const UNCATEGORIZED_VALUE = 'uncategorized';
	const selectValue = value ?? UNCATEGORIZED_VALUE;

	return (
		<Select
			value={selectValue}
			onValueChange={v =>
				onValueChange(v === UNCATEGORIZED_VALUE ? null : (v as TicketCategory))
			}
		>
			<SelectTrigger className='h-auto w-full gap-1.5 border-none bg-transparent p-0 font-medium focus:ring-0'>
				<Badge variant={value ? 'secondary' : 'outline'}>
					<SelectValue />
				</Badge>
			</SelectTrigger>
			<SelectContent>
				{CATEGORY_SELECT_OPTIONS.map(({ value, label }) => (
					<SelectItem key={value} value={value}>
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
