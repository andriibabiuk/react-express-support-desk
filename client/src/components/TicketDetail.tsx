import { formatDate } from '@/components/TicketsTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { TicketSummaryResponse } from 'core';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';

async function summarizeTicket(ticketId: number) {
	const res = await axios.post(`/api/tickets/${ticketId}/summary`);
	return res.data as TicketSummaryResponse;
}

export function TicketDetail({
	ticketId,
	subject,
	senderName,
	senderEmail,
	createdAt,
	body,
}: {
	ticketId: number;
	subject: string;
	senderName: string;
	senderEmail: string;
	createdAt: string;
	body: string;
}) {
	const [summary, setSummary] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const { mutate: summarizeMutate, isPending: isSummarizing } = useMutation({
		mutationFn: () => summarizeTicket(ticketId),
		onSuccess: result => {
			setSummary(result.summary);
		},
		onError: err => {
			const message =
				axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
					? (err.response.data.error as string)
					: 'Failed to summarize ticket.';
			setError(message);
		},
	});

	const handleSummarize = () => {
		setError(null);
		summarizeMutate();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-xl'>{subject}</CardTitle>
				<p className='text-sm text-muted-foreground'>
					{senderName} &lt;{senderEmail}&gt; · {formatDate(createdAt)}
				</p>
			</CardHeader>
			<CardContent>
				<div className='whitespace-pre-wrap'>{body}</div>
				<div className='mt-4'>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={handleSummarize}
						disabled={isSummarizing}
					>
						<Sparkles />
						{isSummarizing ? 'Summarizing...' : 'Summarize'}
					</Button>
					{summary && <p className='mt-2 text-muted-foreground'>{summary}</p>}
					{error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
				</div>
			</CardContent>
		</Card>
	);
}
