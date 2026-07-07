import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { TicketsPage } from './pages/TicketsPage';
import { UsersPage } from './pages/UsersPage';

const queryClient = new QueryClient();

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<Routes>
				<Route path='/login' element={<LoginPage />} />
				<Route element={<ProtectedRoute />}>
					<Route path='/' element={<HomePage />} />
					<Route path='/tickets' element={<TicketsPage />} />
					<Route element={<AdminRoute />}>
						<Route path='/users' element={<UsersPage />} />
					</Route>
				</Route>
			</Routes>
		</QueryClientProvider>
	);
}

export default App;
