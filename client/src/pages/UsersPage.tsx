import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
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

interface User {
	id: string;
	name: string;
	email: string;
	role: 'admin' | 'agent';
	createdAt: string;
}

const SKELETON_ROWS = 5;

// Fixed per-column widths (paired with `table-fixed` below) so the skeleton
// and loaded tables share identical column widths — only the cell content
// swaps, so nothing reflows/jumps when the data arrives.
const COLUMN_WIDTH = {
	name: 'w-48',
	email: 'w-64',
	role: 'w-24',
	created: 'w-32',
};

function formatDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export function UsersPage() {
	const { data, isPending, isError } = useQuery({
		queryKey: ['users'],
		queryFn: () => axios.get('/api/users').then(res => res.data.users as User[]),
	});

	return (
		<main className='flex-1 p-6'>
			<h1 className='text-2xl font-heading font-medium'>Users</h1>

			{isPending && (
				<Table className='mt-4 table-fixed'>
					<TableHeader>
						<TableRow>
							<TableHead className={COLUMN_WIDTH.name}>Name</TableHead>
							<TableHead className={COLUMN_WIDTH.email}>Email</TableHead>
							<TableHead className={COLUMN_WIDTH.role}>Role</TableHead>
							<TableHead className={COLUMN_WIDTH.created}>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: SKELETON_ROWS }, (_, i) => (
							<TableRow key={i}>
								<TableCell>
									<Skeleton className='h-4 w-32' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-4 w-48' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-5 w-16 rounded-4xl' />
								</TableCell>
								<TableCell>
									<Skeleton className='h-4 w-20' />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			{isError && <p className='mt-4 text-sm text-destructive'>Failed to load users.</p>}
			{data && (
				<Table className='mt-4 table-fixed'>
					<TableHeader>
						<TableRow>
							<TableHead className={COLUMN_WIDTH.name}>Name</TableHead>
							<TableHead className={COLUMN_WIDTH.email}>Email</TableHead>
							<TableHead className={COLUMN_WIDTH.role}>Role</TableHead>
							<TableHead className={COLUMN_WIDTH.created}>Created</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map(user => (
							<TableRow key={user.id}>
								<TableCell className='truncate'>{user.name}</TableCell>
								<TableCell className='truncate'>{user.email}</TableCell>
								<TableCell>
									<Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
										{user.role}
									</Badge>
								</TableCell>
								<TableCell>{formatDate(user.createdAt)}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
