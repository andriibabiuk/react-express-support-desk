import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-client';
import { NavBar } from './NavBar';

export function ProtectedRoute() {
	const { data: session, isPending } = useAuth();

	if (isPending) {
		return <div className='p-6 text-center'>Loading…</div>;
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
