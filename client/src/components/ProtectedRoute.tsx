import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../lib/auth-client';
import { NavBar } from './NavBar';

export function ProtectedRoute() {
	const { data: session, isPending } = useAuth();

	if (isPending) {
		return (
			<>
				<nav className='flex items-center justify-between border-b border-border px-6 py-4'>
					<Skeleton className='h-6 w-28' />
					<div className='flex items-center gap-3'>
						<Skeleton className='size-8 rounded-full' />
						<Skeleton className='h-4 w-20' />
					</div>
				</nav>
				<div className='flex flex-1 items-center justify-center p-6'>
					<Skeleton className='h-48 w-full max-w-sm' />
				</div>
			</>
		);
	}

	if (!session) {
		return <Navigate to='/login' replace />;
	}

	return (
		<>
			<NavBar />
			<Outlet />
		</>
	);
}
