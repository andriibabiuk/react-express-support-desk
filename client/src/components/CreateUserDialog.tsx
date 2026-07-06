import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createUserSchema, type CreateUserInput } from 'core';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

function extractErrorMessage(error: unknown) {
	if (
		axios.isAxiosError(error) &&
		typeof error.response?.data?.error === 'string'
	) {
		return error.response.data.error as string;
	}
	return 'Failed to create user.';
}

export function CreateUserDialog() {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const {
		control,
		handleSubmit,
		reset,
		clearErrors,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<CreateUserInput>({
		resolver: zodResolver(createUserSchema),
		defaultValues: { name: '', email: '', password: '' },
	});

	const createUser = useMutation({
		mutationFn: (values: CreateUserInput) => axios.post('/api/users', values),
	});

	const onSubmit = handleSubmit(async values => {
		clearErrors('root');
		try {
			await createUser.mutateAsync(values);
			queryClient.invalidateQueries({ queryKey: ['users'] });
			setOpen(false);
			reset();
		} catch (error) {
			setError('root', { message: extractErrorMessage(error) });
		}
	});

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button>New user</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create user</DialogTitle>
					<DialogDescription>
						Add a new agent to the support desk.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} noValidate>
					<FieldGroup>
						<Controller
							name='name'
							control={control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>Name</FieldLabel>
									<Input
										{...field}
										id={field.name}
										placeholder='Jane Doe'
										autoComplete='name'
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

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
										placeholder='jane@example.com'
										autoComplete='email'
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
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
										placeholder='At least 8 characters'
										autoComplete='new-password'
										aria-invalid={fieldState.invalid}
									/>

									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						{errors.root && <FieldError>{errors.root.message}</FieldError>}
					</FieldGroup>

					<DialogFooter>
						<Button type='submit' disabled={isSubmitting}>
							{isSubmitting ? 'Creating…' : 'Create user'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
