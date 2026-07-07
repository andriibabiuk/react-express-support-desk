import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
	type PaginationState,
	type Table as ReactTable,
	type SortingState,
} from '@tanstack/react-table';
import axios from 'axios';
import {
	defaultPageSize,
	TicketCategory,
	TicketStatus,
	type TicketCategoryFilter,
	type TicketSortField,
	type TicketStatusFilter,
} from 'core';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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

export const STATUS_BADGE_VARIANT: Record<
	TicketStatus,
	'default' | 'secondary' | 'outline'
> = {
	[TicketStatus.open]: 'default',
	[TicketStatus.resolved]: 'secondary',
	[TicketStatus.closed]: 'outline',
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
	[TicketStatus.open]: 'Open',
	[TicketStatus.resolved]: 'Resolved',
	[TicketStatus.closed]: 'Closed',
};

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
	[TicketCategory.generalQuestion]: 'General Question',
	[TicketCategory.technicalQuestion]: 'Technical Question',
	[TicketCategory.refundRequest]: 'Refund Request',
};

export function formatDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

const columnHelper = createColumnHelper<Ticket>();

const columns = [
	columnHelper.accessor('subject', {
		header: 'Subject',
		cell: info => (
			<Link
				to={`/tickets/${info.row.original.id}`}
				className='link font-medium'
			>
				{info.getValue()}
			</Link>
		),
	}),
	columnHelper.accessor('senderName', { header: 'Sender' }),
	columnHelper.accessor('senderEmail', {
		header: 'Email',
		enableSorting: false,
	}),
	columnHelper.accessor('status', {
		header: 'Status',
		cell: info => (
			<Badge variant={STATUS_BADGE_VARIANT[info.getValue()]}>
				{STATUS_LABEL[info.getValue()]}
			</Badge>
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
									{flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
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

const ALL = 'all';
type StatusFilter = TicketStatusFilter | typeof ALL;
type CategoryFilter = TicketCategoryFilter | typeof ALL;

const SEARCH_DEBOUNCE_MS = 300;

export function TicketsTable() {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'createdAt', desc: true },
	]);
	const sortBy = (sorting[0]?.id as TicketSortField | undefined) ?? 'createdAt';
	const sortOrder = sorting[0]?.desc === false ? 'asc' : 'desc';

	const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
	const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL);

	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	useEffect(() => {
		const timeout = setTimeout(
			() => setDebouncedSearch(search.trim()),
			SEARCH_DEBOUNCE_MS,
		);
		return () => clearTimeout(timeout);
	}, [search]);

	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: defaultPageSize,
	});
	// Any change to sort/filter/search invalidates the current page number —
	// e.g. page 5 of "all tickets" may not exist once a filter narrows the
	// result set down to 1 page.
	useEffect(() => {
		setPagination(prev => ({ ...prev, pageIndex: 0 }));
	}, [sortBy, sortOrder, statusFilter, categoryFilter, debouncedSearch]);

	const { data, isPending, isError } = useQuery({
		queryKey: [
			'tickets',
			sortBy,
			sortOrder,
			statusFilter,
			categoryFilter,
			debouncedSearch,
			pagination.pageIndex,
			pagination.pageSize,
		],
		queryFn: () =>
			axios
				.get('/api/tickets', {
					params: {
						sortBy,
						sortOrder,
						status: statusFilter === ALL ? undefined : statusFilter,
						category: categoryFilter === ALL ? undefined : categoryFilter,
						search: debouncedSearch || undefined,
						page: pagination.pageIndex + 1,
						pageSize: pagination.pageSize,
					},
				})
				.then(
					res =>
						res.data as {
							tickets: Ticket[];
							pagination: {
								page: number;
								pageSize: number;
								total: number;
								totalPages: number;
							};
						},
				),
	});

	const rows = useMemo(() => data?.tickets ?? [], [data]);

	const table = useReactTable({
		data: rows,
		columns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		enableMultiSort: false,
		manualSorting: true,
		manualPagination: true,
		pageCount: data?.pagination.totalPages ?? -1,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<>
			<div className='mt-4 flex items-center gap-3'>
				<Input
					value={search}
					onChange={e => setSearch(e.target.value)}
					placeholder='Search subject, sender, or email...'
					aria-label='Search tickets'
					className='w-72'
				/>
				<Select
					value={statusFilter}
					onValueChange={value => setStatusFilter(value as StatusFilter)}
				>
					<SelectTrigger size='sm' className='w-40' aria-label='Status'>
						<SelectValue placeholder='Status' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>All statuses</SelectItem>
						<SelectItem value={TicketStatus.open}>
							{STATUS_LABEL[TicketStatus.open]}
						</SelectItem>
						<SelectItem value={TicketStatus.resolved}>
							{STATUS_LABEL[TicketStatus.resolved]}
						</SelectItem>
						<SelectItem value={TicketStatus.closed}>
							{STATUS_LABEL[TicketStatus.closed]}
						</SelectItem>
					</SelectContent>
				</Select>
				<Select
					value={categoryFilter}
					onValueChange={value => setCategoryFilter(value as CategoryFilter)}
				>
					<SelectTrigger size='sm' className='w-48' aria-label='Category'>
						<SelectValue placeholder='Category' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>All categories</SelectItem>
						<SelectItem value={TicketCategory.generalQuestion}>
							{CATEGORY_LABEL[TicketCategory.generalQuestion]}
						</SelectItem>
						<SelectItem value={TicketCategory.technicalQuestion}>
							{CATEGORY_LABEL[TicketCategory.technicalQuestion]}
						</SelectItem>
						<SelectItem value={TicketCategory.refundRequest}>
							{CATEGORY_LABEL[TicketCategory.refundRequest]}
						</SelectItem>
						<SelectItem value='uncategorized'>Uncategorized</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{isPending && (
				<Table className='mt-3 table-fixed'>
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
			{isError && (
				<p className='mt-4 text-sm text-destructive'>Failed to load tickets.</p>
			)}
			{data && (
				<Table className='mt-3 table-fixed'>
					<TicketsTableHeader table={table} />
					<TableBody>
						{table.getRowModel().rows.map(row => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map(cell => (
									<TableCell
										key={cell.id}
										className={
											TRUNCATE_COLUMNS.has(cell.column.id)
												? 'truncate'
												: undefined
										}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			{data && (
				<div className='mt-3 flex items-center justify-between'>
					<p className='text-sm text-muted-foreground'>
						{data.pagination.total} ticket
						{data.pagination.total === 1 ? '' : 's'}
					</p>
					<div className='flex items-center gap-2'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							Previous
						</Button>
						<span className='text-sm text-muted-foreground'>
							Page {data.pagination.page} of {data.pagination.totalPages}
						</span>
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</>
	);
}
