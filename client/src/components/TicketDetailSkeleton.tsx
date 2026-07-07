import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TicketDetailSkeleton() {
	return (
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
	);
}
