import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
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
}

export function UsersPage() {
	const { data, isPending, isError } = useQuery({
		queryKey: ['users'],
		queryFn: () => axios.get('/api/users').then(res => res.data.users as User[]),
	});

	return (
		<main className='flex-1 p-6'>
			<h1 className='text-2xl font-heading font-medium'>Users</h1>

			{isPending && <p className='mt-4 text-sm text-muted-foreground'>Loading…</p>}
			{isError && <p className='mt-4 text-sm text-destructive'>Failed to load users.</p>}
			{data && (
				<Table className='mt-4'>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map(user => (
							<TableRow key={user.id}>
								<TableCell>{user.name}</TableCell>
								<TableCell>{user.email}</TableCell>
								<TableCell>
									<Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
										{user.role}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
