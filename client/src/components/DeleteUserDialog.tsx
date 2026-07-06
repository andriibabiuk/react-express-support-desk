import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Role } from 'core';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { User } from '@/components/UsersTable';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';

function extractErrorMessage(error: unknown) {
	if (
		axios.isAxiosError(error) &&
		typeof error.response?.data?.error === 'string'
	) {
		return error.response.data.error as string;
	}
	return 'Failed to delete user.';
}

export function DeleteUserDialog({ user }: { user: User }) {
	const [open, setOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const deleteUser = useMutation({
		mutationFn: () => axios.delete(`/api/users/${user.id}`),
	});

	if (user.role === Role.admin) {
		return null;
	}

	const handleConfirm = async (event: { preventDefault: () => void }) => {
		event.preventDefault();
		setErrorMessage(null);
		try {
			await deleteUser.mutateAsync();
			queryClient.invalidateQueries({ queryKey: ['users'] });
			setOpen(false);
		} catch (error) {
			setErrorMessage(extractErrorMessage(error));
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				setErrorMessage(null);
			}}
		>
			<AlertDialogTrigger asChild>
				<Button variant='ghost' size='icon-sm' aria-label={`Delete ${user.name}`}>
					<Trash2 />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
					<AlertDialogDescription>
						{user.name} will be removed from the users list and immediately lose
						access to the support desk.
					</AlertDialogDescription>
				</AlertDialogHeader>

				{errorMessage && <FieldError>{errorMessage}</FieldError>}

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						onClick={handleConfirm}
						disabled={deleteUser.isPending}
					>
						{deleteUser.isPending ? 'Deleting…' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
