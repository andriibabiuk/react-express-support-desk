import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TicketCategory, TicketStatus } from 'core';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

export interface Ticket {
	id: number;
	subject: string;
	senderEmail: string;
	senderName: string;
	status: TicketStatus;
	category: TicketCategory | null;
	createdAt: string;
}

const SKELETON_ROWS = 5;

// Fixed per-column widths (paired with `table-fixed` below) so the skeleton
// and loaded tables share identical column widths — only the cell content
// swaps, so nothing reflows/jumps when the data arrives.
const COLUMN_WIDTH = {
	subject: 'w-56',
	sender: 'w-32',
	email: 'w-56',
	status: 'w-20',
	category: 'w-36',
	created: 'w-28',
};

const STATUS_BADGE_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
	[TicketStatus.open]: 'default',
	[TicketStatus.resolved]: 'secondary',
	[TicketStatus.closed]: 'outline',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
	[TicketStatus.open]: 'Open',
	[TicketStatus.resolved]: 'Resolved',
	[TicketStatus.closed]: 'Closed',
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
	[TicketCategory.generalQuestion]: 'General Question',
	[TicketCategory.technicalQuestion]: 'Technical Question',
	[TicketCategory.refundRequest]: 'Refund Request',
};

function formatDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export function TicketsTable() {
	const { data, isPending, isError } = useQuery({
		queryKey: ['tickets'],
		queryFn: () => axios.get('/api/tickets').then(res => res.data.tickets as Ticket[]),
	});

	return (
		<>
			{isPending && (
				<Table className='mt-4 table-fixed'>
					<TableHeader>
						<TableRow>
							<TableHead className={COLUMN_WIDTH.subject}>Subject</TableHead>
							<TableHead className={COLUMN_WIDTH.sender}>Sender</TableHead>
							<TableHead className={COLUMN_WIDTH.email}>Email</TableHead>
							<TableHead className={COLUMN_WIDTH.status}>Status</TableHead>
							<TableHead className={COLUMN_WIDTH.category}>Category</TableHead>
							<TableHead className={COLUMN_WIDTH.created}>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: SKELETON_ROWS }, (_, i) => (
							<TableRow key={i}>
								<TableCell>
									<Skeleton className='h-4 w-48' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-4 w-24' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-4 w-48' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-5 w-16 rounded-4xl' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-5 w-28 rounded-4xl' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-4 w-20' />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			{isError && <p className='mt-4 text-sm text-destructive'>Failed to load tickets.</p>}
			{data && (
				<Table className='mt-4 table-fixed'>
					<TableHeader>
						<TableRow>
							<TableHead className={COLUMN_WIDTH.subject}>Subject</TableHead>
							<TableHead className={COLUMN_WIDTH.sender}>Sender</TableHead>
							<TableHead className={COLUMN_WIDTH.email}>Email</TableHead>
							<TableHead className={COLUMN_WIDTH.status}>Status</TableHead>
							<TableHead className={COLUMN_WIDTH.category}>Category</TableHead>
							<TableHead className={COLUMN_WIDTH.created}>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map(ticket => (
							<TableRow key={ticket.id}>
								<TableCell className='truncate'>{ticket.subject}</TableCell>
								<TableCell className='truncate'>{ticket.senderName}</TableCell>
								<TableCell className='truncate'>{ticket.senderEmail}</TableCell>
								<TableCell>
									<Badge variant={STATUS_BADGE_VARIANT[ticket.status]}>
										{STATUS_LABEL[ticket.status]}
									</Badge>
								</TableCell>
								<TableCell>
									{ticket.category ? (
										<Badge variant='secondary'>{CATEGORY_LABEL[ticket.category]}</Badge>
									) : (
										<Badge variant='outline'>Uncategorized</Badge>
									)}
								</TableCell>
								<TableCell>{formatDate(ticket.createdAt)}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</>
	);
}
