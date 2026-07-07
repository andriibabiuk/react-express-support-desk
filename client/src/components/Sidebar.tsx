import { Role } from 'core';
import { LayoutDashboard, LogOut, Ticket, Users } from 'lucide-react';
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

const navItemClass = ({ isActive }: { isActive: boolean }) =>
	`group/nav flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
		isActive
			? 'bg-sidebar-accent text-sidebar-foreground'
			: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
	}`;

function NavIcon({
	icon: Icon,
	isActive,
}: {
	icon: typeof Ticket;
	isActive: boolean;
}) {
	return (
		<Icon
			className={`size-4 shrink-0 ${isActive ? 'text-primary' : ''}`}
			aria-hidden
		/>
	);
}

export function Sidebar() {
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
		<nav className='flex w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:w-56'>
			<Link
				to='/'
				className='flex items-center gap-2.5 px-3 py-5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:px-4'
			>
				<span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground'>
					SD
				</span>
				<span className='hidden font-heading text-sm font-medium tracking-wide text-sidebar-foreground md:inline'>
					Support&nbsp;Desk
				</span>
			</Link>

			<div className='flex flex-1 flex-col gap-1 px-2'>
				<NavLink to='/' end className={navItemClass}>
					{({ isActive }) => (
						<>
							<NavIcon icon={LayoutDashboard} isActive={isActive} />
							<span className='hidden md:inline'>Dashboard</span>
						</>
					)}
				</NavLink>
				<NavLink to='/tickets' className={navItemClass}>
					{({ isActive }) => (
						<>
							<NavIcon icon={Ticket} isActive={isActive} />
							<span className='hidden md:inline'>Tickets</span>
						</>
					)}
				</NavLink>
				{session?.user.role === Role.admin && (
					<NavLink to='/users' className={navItemClass}>
						{({ isActive }) => (
							<>
								<NavIcon icon={Users} isActive={isActive} />
								<span className='hidden md:inline'>Users</span>
							</>
						)}
					</NavLink>
				)}
			</div>

			<div className='flex items-center gap-2.5 border-t border-sidebar-border px-2 py-3 md:px-3'>
				<Avatar size='sm' className='shrink-0'>
					<AvatarFallback>{initials(session?.user.name)}</AvatarFallback>
				</Avatar>
				<span className='hidden min-w-0 flex-1 truncate text-sm text-sidebar-foreground md:inline'>
					{session?.user.name}
				</span>
				<Button
					type='button'
					variant='ghost'
					size='icon-sm'
					onClick={handleSignOut}
					aria-label='Sign out'
					className='shrink-0 text-muted-foreground hover:text-sidebar-foreground'
				>
					<LogOut className='size-4' />
				</Button>
			</div>
		</nav>
	);
}
