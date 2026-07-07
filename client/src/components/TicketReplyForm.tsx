import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
	type CreateReplyInput,
	type PolishReplyResponse,
	type TicketReply,
} from 'core';
import { Sparkles } from 'lucide-react';
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

async function polishReply({
	ticketId,
	body,
}: { ticketId: number } & CreateReplyInput) {
	const res = await axios.post(`/api/tickets/${ticketId}/replies/polish`, {
		body,
	});
	return res.data as PolishReplyResponse;
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

	const { mutate: polishReplyMutate, isPending: isPolishing } = useMutation({
		mutationFn: polishReply,
		onSuccess: polished => {
			setBody(polished.body);
		},
		onError: err => {
			const message =
				axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
					? (err.response.data.error as string)
					: 'Failed to polish reply.';
			setError(message);
		},
	});

	const isBusy = isReplying || isPolishing;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!body.trim()) return;
		createReplyMutate({ ticketId, body });
	};

	const handlePolish = () => {
		setError(null);
		if (!body.trim()) return;
		polishReplyMutate({ ticketId, body });
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
						disabled={isBusy}
					/>
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={handlePolish}
							disabled={isBusy || !body.trim()}
						>
							<Sparkles />
							{isPolishing ? 'Polishing...' : 'Polish'}
						</Button>
						<Button type='submit' disabled={isBusy || !body.trim()}>
							{isReplying ? 'Replying...' : 'Reply'}
						</Button>
					</div>
					{error && <p className='text-sm text-destructive'>{error}</p>}
				</form>
			</CardContent>
		</Card>
	);
}
