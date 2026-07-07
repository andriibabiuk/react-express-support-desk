import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { type CreateReplyInput, type TicketReply } from 'core';
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';

async function createReply({
	ticketId,
	body,
}: { ticketId: number } & CreateReplyInput) {
	const res = await axios.post(`/api/tickets/${ticketId}/replies`, { body });
	return res.data as TicketReply;
}

export function TicketReplyForm({ ticketId }: { ticketId: number }) {
	const queryClient = useQueryClient();
	const [body, setBody] = useState('');
	const [error, setError] = useState<string | null>(null);

	const { mutate: createReplyMutate, isPending: isReplying } = useMutation({
		mutationFn: createReply,
		onSuccess: newReply => {
			queryClient.setQueryData(
				['tickets', ticketId, 'replies'],
				(old: TicketReply[] | undefined) =>
					old ? [...old, newReply] : [newReply],
			);
			setBody('');
		},
		onError: err => {
			const message =
				axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
					? (err.response.data.error as string)
					: 'Failed to send reply.';
			setError(message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!body.trim()) return;
		createReplyMutate({ ticketId, body });
	};

	return (
		<Card className='mt-6'>
			<CardHeader>
				<CardTitle>Add Reply</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<Textarea
						value={body}
						onChange={e => setBody(e.target.value)}
						placeholder='Type your reply here...'
						disabled={isReplying}
					/>
					<Button type='submit' disabled={isReplying || !body.trim()}>
						{isReplying ? 'Replying...' : 'Reply'}
					</Button>
					{error && <p className='text-sm text-destructive'>{error}</p>}
				</form>
			</CardContent>
		</Card>
	);
}
