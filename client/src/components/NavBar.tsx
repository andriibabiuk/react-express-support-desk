import { Role } from 'core';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { authClient, useAuth } from '../lib/auth-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function initials(name?: string) {
	if (!name) return '?';
	return name
		.split(' ')
		.map(part => part[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

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
		<nav className='flex items-center justify-between border-b border-border px-6 py-4'>
			<div className='flex items-center gap-6'>
				<Link to='/' className='font-heading font-medium'>
						Support Desk
					</Link>
				{session?.user.role === Role.admin && (
					<NavLink
						to='/users'
						className={({ isActive }) =>
							`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`
						}
					>
						Users
					</NavLink>
				)}
			</div>
			<div className='flex items-center gap-3'>
				<Avatar size='sm'>
					<AvatarFallback>{initials(session?.user.name)}</AvatarFallback>
				</Avatar>
				<span className='text-sm'>{session?.user.name}</span>
				<Button type='button' variant='outline' size='sm' onClick={handleSignOut}>
					Sign out
				</Button>
			</div>
		</nav>
	);
}
