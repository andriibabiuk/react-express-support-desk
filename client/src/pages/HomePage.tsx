import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../lib/auth-client';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

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

export function HomePage() {
	const { data: session } = useAuth();
	const { data, isPending, isError } = useQuery({
		queryKey: ['health'],
		queryFn: () => axios.get('/api/health').then(res => res.data),
	});

	const status = isPending ? 'checking' : isError || data.status !== 'ok' ? 'error' : 'ok';

	return (
		<main className='flex flex-1 items-center justify-center p-6'>
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
		</main>
	);
}
