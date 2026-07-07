import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TicketDetail } from './TicketDetail';

function expectedDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

describe('TicketDetail', () => {
	it('renders the subject, sender, formatted date, and body', () => {
		render(
			<TicketDetail
				subject='Refund question'
				senderName='Sam Student'
				senderEmail='sam@example.com'
				createdAt='2026-01-15T00:00:00.000Z'
				body='Can I get a refund for my last order?'
			/>,
		);

		expect(screen.getByText('Refund question')).toBeInTheDocument();
		expect(screen.getByText('Sam Student <sam@example.com>', { exact: false })).toBeInTheDocument();
		expect(
			screen.getByText(expectedDate('2026-01-15T00:00:00.000Z'), { exact: false }),
		).toBeInTheDocument();
		expect(
			screen.getByText('Can I get a refund for my last order?'),
		).toBeInTheDocument();
	});

	it('preserves whitespace and line breaks in the body', () => {
		render(
			<TicketDetail
				subject='Subject'
				senderName='Sender'
				senderEmail='sender@example.com'
				createdAt='2026-01-15T00:00:00.000Z'
				body={'Line one\nLine two'}
			/>,
		);

		expect(screen.getByText('Line one', { exact: false })).toHaveClass('whitespace-pre-wrap');
	});
});
