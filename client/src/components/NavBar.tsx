import { useNavigate } from 'react-router-dom';
import { authClient, useAuth } from '../lib/auth-client';

export function NavBar() {
	const navigate = useNavigate();
	const { data: session } = useAuth();

	const handleSignOut = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => navigate('/login', { replace: true }),
			},
		});
	};

	return (
		<nav className='flex items-center justify-between border-b border-(--border) px-6 py-4'>
			<span className='font-medium text-(--text-h)'>Support Desk</span>
			<div className='flex items-center gap-4'>
				<span className='text-sm'>{session?.user.name}</span>
				<button
					type='button'
					onClick={handleSignOut}
					className='rounded-md border border-(--border) px-3 py-1.5 text-sm hover:bg-(--code-bg)'
				>
					Sign out
				</button>
			</div>
		</nav>
	);
}
