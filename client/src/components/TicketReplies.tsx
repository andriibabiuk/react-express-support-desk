import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { type TicketReply } from 'core';
import DOMPurify from 'dompurify';
import { formatDate } from './TicketsTable';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';

function ReplyThread({ replies }: { replies: TicketReply[] }) {
	if (replies.length === 0) {
		return <p className='text-sm text-muted-foreground'>No replies yet.</p>;
	}

	return (
		<div className='space-y-6'>
			{replies.map(reply => {
				const authorName = reply.author?.name ?? 'Customer';
				return (
					<div key={reply.id} className='flex gap-4'>
						<Avatar>
							{reply.author && (
								<AvatarImage
									src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${reply.author.email}`}
								/>
							)}
							<AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
						</Avatar>
						<div className='flex-1'>
							<div className='flex items-baseline justify-between'>
								<p className='font-semibold'>{authorName}</p>
								<p className='text-xs text-muted-foreground'>
									{formatDate(reply.createdAt)}
								</p>
							</div>
							{reply.bodyHtml ? (
								<div
									className='mt-2 text-sm'
									dangerouslySetInnerHTML={{
										__html: DOMPurify.sanitize(reply.bodyHtml),
									}}
								/>
							) : (
								<div className='mt-2 whitespace-pre-wrap text-sm'>{reply.body}</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function TicketReplies({ ticketId }: { ticketId: number }) {
	const {
		data: replies,
		isPending,
		isError,
	} = useQuery({
		queryKey: ['tickets', ticketId, 'replies'],
		queryFn: () =>
			axios
				.get(`/api/tickets/${ticketId}/replies`)
				.then(res => res.data.replies as TicketReply[]),
		enabled: !isNaN(ticketId),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Replies</CardTitle>
			</CardHeader>
			<CardContent>
				{isPending && (
					<div className='space-y-2'>
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-2/3' />
					</div>
				)}
				{isError && (
					<p className='text-sm text-destructive'>Failed to load replies.</p>
				)}
				{replies && <ReplyThread replies={replies} />}
			</CardContent>
		</Card>
	);
}
