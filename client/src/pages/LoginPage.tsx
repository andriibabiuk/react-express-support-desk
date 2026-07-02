import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authClient, useAuth } from '../lib/auth-client';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
	email: z.email('Enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = useAuth();
	const {
		control,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: '', password: '' },
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
			<Card className='w-full max-w-sm'>
				<CardHeader>
					<CardTitle className='text-2xl'>Sign in</CardTitle>
					<CardDescription>Enter your email and password to continue</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} noValidate>
						<FieldGroup>
							<Controller
								name='email'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={field.name}>Email</FieldLabel>
										<Input
											{...field}
											id={field.name}
											type='email'
											autoComplete='email'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
									</Field>
								)}
							/>

							<Controller
								name='password'
								control={control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={field.name}>Password</FieldLabel>
										<Input
											{...field}
											id={field.name}
											type='password'
											autoComplete='current-password'
											aria-invalid={fieldState.invalid}
										/>
										{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
									</Field>
								)}
							/>

							{errors.root && (
								<FieldError>{errors.root.message}</FieldError>
							)}

							<Field>
								<Button type='submit' disabled={isSubmitting}>
									{isSubmitting ? 'Signing in…' : 'Sign in'}
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
