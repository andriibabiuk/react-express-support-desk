import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
	type SortingState,
	type Table as ReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { TicketCategory, TicketStatus, type TicketSortField } from 'core';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
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
// swaps, so nothing reflows/jumps when the data arrives. Keyed by column id,
// which for every column below is just its `Ticket` accessor key.
const COLUMN_WIDTH: Record<string, string> = {
	subject: 'w-56',
	senderName: 'w-32',
	senderEmail: 'w-56',
	status: 'w-20',
	category: 'w-36',
	createdAt: 'w-28',
};

const TRUNCATE_COLUMNS = new Set(['subject', 'senderName', 'senderEmail']);

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

const columnHelper = createColumnHelper<Ticket>();

const columns = [
	columnHelper.accessor('subject', { header: 'Subject' }),
	columnHelper.accessor('senderName', { header: 'Sender' }),
	columnHelper.accessor('senderEmail', { header: 'Email', enableSorting: false }),
	columnHelper.accessor('status', {
		header: 'Status',
		cell: info => (
			<Badge variant={STATUS_BADGE_VARIANT[info.getValue()]}>{STATUS_LABEL[info.getValue()]}</Badge>
		),
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		cell: info => {
			const category = info.getValue();
			return category ? (
				<Badge variant='secondary'>{CATEGORY_LABEL[category]}</Badge>
			) : (
				<Badge variant='outline'>Uncategorized</Badge>
			);
		},
	}),
	columnHelper.accessor('createdAt', {
		header: 'Created',
		cell: info => formatDate(info.getValue()),
	}),
];

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
	if (direction === 'asc') return <ArrowUp className='size-3.5' />;
	if (direction === 'desc') return <ArrowDown className='size-3.5' />;
	return <ChevronsUpDown className='size-3.5 text-muted-foreground' />;
}

function TicketsTableHeader({ table }: { table: ReactTable<Ticket> }) {
	return (
		<TableHeader>
			{table.getHeaderGroups().map(headerGroup => (
				<TableRow key={headerGroup.id}>
					{headerGroup.headers.map(header => (
						<TableHead
							key={header.id}
							className={COLUMN_WIDTH[header.column.id]}
							aria-sort={
								header.column.getIsSorted() === 'asc'
									? 'ascending'
									: header.column.getIsSorted() === 'desc'
										? 'descending'
										: 'none'
							}
						>
							{header.column.getCanSort() ? (
								<button
									type='button'
									className='flex items-center gap-1 hover:text-foreground/80'
									onClick={header.column.getToggleSortingHandler()}
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
									<SortIcon direction={header.column.getIsSorted()} />
								</button>
							) : (
								flexRender(header.column.columnDef.header, header.getContext())
							)}
						</TableHead>
					))}
				</TableRow>
			))}
		</TableHeader>
	);
}

export function TicketsTable() {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
	const sortBy = (sorting[0]?.id as TicketSortField | undefined) ?? 'createdAt';
	const sortOrder = sorting[0]?.desc === false ? 'asc' : 'desc';

	const { data, isPending, isError } = useQuery({
		queryKey: ['tickets', sortBy, sortOrder],
		queryFn: () =>
			axios
				.get('/api/tickets', { params: { sortBy, sortOrder } })
				.then(res => res.data.tickets as Ticket[]),
	});

	const rows = useMemo(() => data ?? [], [data]);

	const table = useReactTable({
		data: rows,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		enableMultiSort: false,
		manualSorting: true,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<>
			{isPending && (
				<Table className='mt-4 table-fixed'>
					<TicketsTableHeader table={table} />
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
					<TicketsTableHeader table={table} />
					<TableBody>
						{table.getRowModel().rows.map(row => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map(cell => (
									<TableCell
										key={cell.id}
										className={TRUNCATE_COLUMNS.has(cell.column.id) ? 'truncate' : undefined}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</>
	);
}
