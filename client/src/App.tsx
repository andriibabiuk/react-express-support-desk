import { Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';

function App() {
	return (
		<Routes>
			<Route path='/login' element={<LoginPage />} />
			<Route element={<ProtectedRoute />}>
				<Route path='/' element={<HomePage />} />
				<Route element={<AdminRoute />}>
					<Route path='/users' element={<UsersPage />} />
				</Route>
			</Route>
		</Routes>
	);
}

export default App;
