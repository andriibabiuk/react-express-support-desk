import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authClient, useAuth } from '../lib/auth-client';

const loginSchema = z.object({
	email: z.email('Enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = useAuth();
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
	});

	useEffect(() => {
		if (!isPending && session) {
			navigate('/', { replace: true });
		}
	}, [isPending, session, navigate]);

	const onSubmit = handleSubmit(async data => {
		await authClient.signIn.email(data, {
			onSuccess: () => navigate('/', { replace: true }),
			onError: ctx => setError('root', { message: ctx.error.message }),
		});
	});

	return (
		<main className='flex flex-1 items-center justify-center p-6'>
			<form
				onSubmit={onSubmit}
				noValidate
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
					{...register('email')}
					className={`w-full rounded-md border px-3 py-2 text-sm ${
						errors.email ? 'border-red-600' : 'border-(--border)'
					}`}
				/>
				{errors.email && (
					<p className='mt-1 text-sm text-red-600'>{errors.email.message}</p>
				)}

				<label htmlFor='password' className='mt-4 mb-1 block text-sm'>
					Password
				</label>
				<input
					id='password'
					type='password'
					autoComplete='current-password'
					{...register('password')}
					className={`w-full rounded-md border px-3 py-2 text-sm ${
						errors.password ? 'border-red-600' : 'border-(--border)'
					}`}
				/>
				{errors.password && (
					<p className='mt-1 text-sm text-red-600'>{errors.password.message}</p>
				)}

				{errors.root && (
					<p className='mt-4 text-sm text-red-600'>{errors.root.message}</p>
				)}

				<button
					type='submit'
					disabled={isSubmitting}
					className='mt-6 w-full rounded-md bg-(--accent) px-3 py-2 text-sm font-medium text-white disabled:opacity-50'
				>
					{isSubmitting ? 'Signing in…' : 'Sign in'}
				</button>
			</form>
		</main>
	);
}
