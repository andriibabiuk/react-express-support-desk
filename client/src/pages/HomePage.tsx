import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { TicketStats } from 'core';
import { useAuth } from '../lib/auth-client';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketsPerDayChart } from '@/components/TicketsPerDayChart';

const statusLabel = {
	checking: 'Checking…',
	ok: 'Operational',
	error: 'Unavailable',
} as const;

const statusVariant = {
	checking: 'secondary',
	ok: 'default',
	error: 'destructive',
} as const;

// Formats a duration in milliseconds as e.g. "2d 5h", "3h 24m", "12m" —
// the coarsest two units, so it stays glanceable on a stat tile rather than
// spelling out every unit down to seconds.
function formatDuration(ms: number): string {
	const minutes = Math.round(ms / 60_000);
	if (minutes < 1) return '<1m';

	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const mins = minutes % 60;

	if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	return `${mins}m`;
}

const STAT_TILES: {
	label: string;
	value: (stats: TicketStats) => string;
}[] = [
	{ label: 'Total tickets', value: stats => stats.totalTickets.toLocaleString() },
	{ label: 'Open tickets', value: stats => stats.openTickets.toLocaleString() },
	{
		label: 'Resolved by AI',
		value: stats => stats.resolvedByAiCount.toLocaleString(),
	},
	{
		label: '% resolved by AI',
		value: stats => `${stats.resolvedByAiPercent.toFixed(1)}%`,
	},
	{
		label: 'Avg. resolution time',
		value: stats =>
			stats.avgResolutionMs === null ? '—' : formatDuration(stats.avgResolutionMs),
	},
];

function DashboardStats() {
	const { data, isPending, isError } = useQuery({
		queryKey: ['ticket-stats'],
		queryFn: () =>
			axios.get('/api/tickets/stats').then(res => res.data as TicketStats),
	});

	return (
		<div className='flex flex-col gap-4'>
			<div className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
				{STAT_TILES.map(tile => (
					<Card key={tile.label} size='sm'>
						<CardHeader>
							<CardDescription>{tile.label}</CardDescription>
						</CardHeader>
						<CardContent>
							{isPending && <Skeleton className='h-8 w-16' />}
							{isError && <span className='text-sm text-destructive'>—</span>}
							{data && <p className='text-2xl font-medium'>{tile.value(data)}</p>}
						</CardContent>
					</Card>
				))}
			</div>
			<TicketsPerDayChart
				data={data?.dailyTicketCounts}
				isPending={isPending}
				isError={isError}
			/>
		</div>
	);
}

export function HomePage() {
	const { data: session } = useAuth();
	const { data, isPending, isError } = useQuery({
		queryKey: ['health'],
		queryFn: () => axios.get('/api/health').then(res => res.data),
	});

	const status = isPending ? 'checking' : isError || data.status !== 'ok' ? 'error' : 'ok';

	return (
		<main className='flex flex-1 flex-col gap-6 p-6'>
			<Card className='w-full max-w-sm'>
				<CardHeader>
					<CardTitle className='text-2xl'>Welcome, {session?.user.name}</CardTitle>
					<CardDescription>Support Desk dashboard</CardDescription>
				</CardHeader>
				<CardContent className='flex items-center gap-2'>
					<span className='text-sm text-muted-foreground'>API status</span>
					<Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
				</CardContent>
			</Card>
			<DashboardStats />
		</main>
	);
}
