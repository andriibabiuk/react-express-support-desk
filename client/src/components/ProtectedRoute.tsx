import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../lib/auth-client';
import { Sidebar } from './Sidebar';

export function ProtectedRoute() {
	const { data: session, isPending } = useAuth();

	if (isPending) {
		return (
			<div className='flex flex-1'>
				<div className='flex w-16 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-3 md:w-56'>
					<Skeleton className='h-7 w-7 rounded-md md:w-32' />
					<div className='flex flex-1 flex-col gap-2'>
						<Skeleton className='h-8 w-full' />
						<Skeleton className='h-8 w-full' />
					</div>
				</div>
				<div className='flex flex-1 items-center justify-center p-6'>
					<Skeleton className='h-48 w-full max-w-sm' />
				</div>
			</div>
		);
	}

	if (!session) {
		return <Navigate to='/login' replace />;
	}

	return (
		<div className='flex flex-1'>
			<Sidebar />
			<div className='flex flex-1 flex-col overflow-x-hidden'>
				<Outlet />
			</div>
		</div>
	);
}
