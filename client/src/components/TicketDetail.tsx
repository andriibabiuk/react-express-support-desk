import { formatDate } from '@/components/TicketsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TicketDetail({
	subject,
	senderName,
	senderEmail,
	createdAt,
	body,
}: {
	subject: string;
	senderName: string;
	senderEmail: string;
	createdAt: string;
	body: string;
}) {
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
			</CardContent>
		</Card>
	);
}
