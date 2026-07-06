import { CreateUserDialog } from '@/components/CreateUserDialog';
import { UsersTable } from '@/components/UsersTable';

export function UsersPage() {
	return (
		<main className='flex-1 p-6'>
			<div className='flex items-center justify-between'>
				<h1 className='text-2xl font-heading font-medium'>Users</h1>
				<CreateUserDialog />
			</div>

			<UsersTable />
		</main>
	);
}
