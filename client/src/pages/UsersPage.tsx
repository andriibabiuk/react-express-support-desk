import { useEffect, useState } from 'react';
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
	const [users, setUsers] = useState<User[]>([]);
	const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

	useEffect(() => {
		fetch('/api/users')
			.then(res => res.json())
			.then(data => {
				setUsers(data.users);
				setStatus('ok');
			})
			.catch(() => setStatus('error'));
	}, []);

	return (
		<main className='flex-1 p-6'>
			<h1 className='text-2xl font-heading font-medium'>Users</h1>

			{status === 'loading' && (
				<p className='mt-4 text-sm text-muted-foreground'>Loading…</p>
			)}
			{status === 'error' && (
				<p className='mt-4 text-sm text-destructive'>Failed to load users.</p>
			)}
			{status === 'ok' && (
				<Table className='mt-4'>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map(user => (
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
