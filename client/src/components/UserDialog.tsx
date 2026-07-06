import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createUserSchema, updateUserSchema } from 'core';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { User } from '@/components/UsersTable';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface UserFormValues {
	name: string;
	email: string;
	password: string;
}

type UserDialogProps = { mode: 'create' } | { mode: 'edit'; user: User };

function getDefaultValues(props: UserDialogProps): UserFormValues {
	if (props.mode === 'edit') {
		return { name: props.user.name, email: props.user.email, password: '' };
	}
	return { name: '', email: '', password: '' };
}

export function UserDialog(props: UserDialogProps) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();

	const {
		control,
		handleSubmit,
		reset,
		clearErrors,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<UserFormValues>({
		resolver: zodResolver(props.mode === 'edit' ? updateUserSchema : createUserSchema),
		defaultValues: getDefaultValues(props),
	});

	const saveUser = useMutation({
		mutationFn: (values: UserFormValues) =>
			props.mode === 'edit'
				? axios.patch(`/api/users/${props.user.id}`, values)
				: axios.post('/api/users', values),
	});

	const onSubmit = handleSubmit(async values => {
		clearErrors('root');
		try {
			await saveUser.mutateAsync(values);
			queryClient.invalidateQueries({ queryKey: ['users'] });
			setOpen(false);
			reset(getDefaultValues(props));
		} catch (error) {
			const fallback =
				props.mode === 'edit' ? 'Failed to update user.' : 'Failed to create user.';
			const message =
				axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
					? (error.response.data.error as string)
					: fallback;
			setError('root', { message });
		}
	});

	const title = props.mode === 'edit' ? 'Edit user' : 'Create user';
	const description =
		props.mode === 'edit'
			? `Update ${props.user.name}’s account details.`
			: 'Add a new agent to the support desk.';
	const submitLabel = props.mode === 'edit' ? 'Save changes' : 'Create user';
	const submittingLabel = props.mode === 'edit' ? 'Saving…' : 'Creating…';
	const passwordPlaceholder =
		props.mode === 'edit' ? 'Leave blank to keep current password' : 'At least 8 characters';

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				clearErrors('root');
				reset(getDefaultValues(props));
			}}
		>
			<DialogTrigger asChild>
				{props.mode === 'edit' ? (
					<Button variant='ghost' size='icon-sm' aria-label={`Edit ${props.user.name}`}>
						<Pencil />
					</Button>
				) : (
					<Button>New user</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
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
									{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
										placeholder={passwordPlaceholder}
										autoComplete='new-password'
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
								</Field>
							)}
						/>

						{errors.root && <FieldError>{errors.root.message}</FieldError>}
					</FieldGroup>

					<DialogFooter>
						<Button type='submit' disabled={isSubmitting}>
							{isSubmitting ? submittingLabel : submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
