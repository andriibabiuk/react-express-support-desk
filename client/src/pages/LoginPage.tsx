import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient, useAuth } from '../lib/auth-client';

export function LoginPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!isPending && session) {
			navigate('/', { replace: true });
		}
	}, [isPending, session, navigate]);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		await authClient.signIn.email(
			{ email, password },
			{
				onSuccess: () => navigate('/', { replace: true }),
				onError: ctx => setError(ctx.error.message),
			},
		);
		setSubmitting(false);
	};

	return (
		<main className='flex flex-1 items-center justify-center p-6'>
			<form
				onSubmit={handleSubmit}
				className='w-full max-w-sm rounded-lg border border-(--border) p-8 text-left'
			>
				<h1 className='mb-6 text-center text-2xl font-semibold tracking-normal text-(--text-h)'>
					Sign in
				</h1>

				<label htmlFor='email' className='mb-1 block text-sm'>
					Email
				</label>
				<input
					id='email'
					type='email'
					autoComplete='email'
					required
					value={email}
					onChange={event => setEmail(event.target.value)}
					className='mb-4 w-full rounded-md border border-(--border) px-3 py-2 text-sm'
				/>

				<label htmlFor='password' className='mb-1 block text-sm'>
					Password
				</label>
				<input
					id='password'
					type='password'
					autoComplete='current-password'
					required
					value={password}
					onChange={event => setPassword(event.target.value)}
					className='mb-4 w-full rounded-md border border-(--border) px-3 py-2 text-sm'
				/>

				{error && <p className='mb-4 text-sm text-red-600'>{error}</p>}

				<button
					type='submit'
					disabled={submitting}
					className='w-full rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-white disabled:opacity-50'
				>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>
			</form>
		</main>
	);
}
