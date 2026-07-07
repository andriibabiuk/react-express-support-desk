import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BackLink({ to, label }: { to: string; label: string }) {
	return (
		<Link
			to={to}
			className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
		>
			<ArrowLeft className='size-3.5' />
			{label}
		</Link>
	);
}
