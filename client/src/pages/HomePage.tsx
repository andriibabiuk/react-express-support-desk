import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-client';

export function HomePage() {
	const { data: session } = useAuth();
	const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');

	useEffect(() => {
		fetch('/api/health')
			.then(res => res.json())
			.then(data => setStatus(data.status === 'ok' ? 'ok' : 'error'))
			.catch(() => setStatus('error'));
	}, []);

	return (
		<main className='flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center'>
			<h1>Welcome, {session?.user.name}</h1>
			<p className='text-sm'>API status: {status}</p>
		</main>
	);
}
