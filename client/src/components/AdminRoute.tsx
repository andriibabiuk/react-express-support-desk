import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-client';

export function AdminRoute() {
	const { data: session } = useAuth();

	if (session?.user.role !== 'admin') {
		return <Navigate to='/' replace />;
	}

	return <Outlet />;
}
