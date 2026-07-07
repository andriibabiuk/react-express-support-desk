import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

interface Assignee {
	id: string;
	name: string;
	email: string;
}

const UNASSIGNED = 'unassigned';

export function TicketAssigneeSelect({
	ticketId,
	assignedToId,
}: {
	ticketId: number;
	assignedToId: string | null;
}) {
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);

	const { data } = useQuery({
		queryKey: ['ticket-assignees'],
		queryFn: () =>
			axios
				.get('/api/tickets/assignees')
				.then(res => res.data.assignees as Assignee[]),
	});
	const assignees = data ?? [];

	const assign = useMutation({
		mutationFn: (nextAssignedToId: string | null) =>
			axios.patch(`/api/tickets/${ticketId}`, {
				assignedToId: nextAssignedToId,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tickets', ticketId], exact: true });
		},
	});

	const handleChange = (value: string) => {
		setError(null);
		const nextAssignedToId = value === UNASSIGNED ? null : value;
		assign.mutate(nextAssignedToId, {
			onError: err => {
				const message =
					axios.isAxiosError(err) &&
					typeof err.response?.data?.error === 'string'
						? (err.response.data.error as string)
						: 'Failed to assign ticket.';
				setError(message);
			},
		});
	};

	return (
		<div>
			<Select
				value={assignedToId ?? UNASSIGNED}
				onValueChange={handleChange}
				disabled={assign.isPending}
			>
				<SelectTrigger size='sm' className='w-full' aria-label='Assigned to'>
					<SelectValue placeholder='Unassigned' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
					{assignees.map(assignee => (
						<SelectItem key={assignee.id} value={assignee.id}>
							{assignee.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && <p className='mt-1 text-sm text-destructive'>{error}</p>}
		</div>
	);
}
