import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { TicketDetail } from './TicketDetail';

vi.mock('axios', () => ({
	default: { post: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedPost = axios.post as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

function renderTicketDetail() {
	return renderWithQuery(
		<TicketDetail
			ticketId={1}
			subject='Refund question'
			senderName='Sam Student'
			senderEmail='sam@example.com'
			createdAt='2026-01-15T00:00:00.000Z'
			body='Can I get a refund for my last order?'
		/>,
	);
}

function expectedDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

describe('TicketDetail', () => {
	afterEach(() => {
		mockedPost.mockReset();
		mockedIsAxiosError.mockReset();
	});

	it('renders the subject, sender, formatted date, and body', () => {
		renderTicketDetail();

		expect(screen.getByText('Refund question')).toBeInTheDocument();
		expect(
			screen.getByText('Sam Student <sam@example.com>', { exact: false }),
		).toBeInTheDocument();
		expect(
			screen.getByText(expectedDate('2026-01-15T00:00:00.000Z'), { exact: false }),
		).toBeInTheDocument();
		expect(
			screen.getByText('Can I get a refund for my last order?'),
		).toBeInTheDocument();
	});

	it('preserves whitespace and line breaks in the body', () => {
		renderWithQuery(
			<TicketDetail
				ticketId={1}
				subject='Subject'
				senderName='Sender'
				senderEmail='sender@example.com'
				createdAt='2026-01-15T00:00:00.000Z'
				body={'Line one\nLine two'}
			/>,
		);

		expect(screen.getByText('Line one', { exact: false })).toHaveClass(
			'whitespace-pre-wrap',
		);
	});

	it('requests a summary and displays it on success', async () => {
		mockedPost.mockResolvedValue({
			data: { summary: 'Customer wants a refund for their last order.' },
		});

		renderTicketDetail();

		fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));

		await waitFor(() => {
			expect(mockedPost).toHaveBeenCalledWith('/api/tickets/1/summary');
		});
		expect(
			await screen.findByText('Customer wants a refund for their last order.'),
		).toBeInTheDocument();
	});

	it('shows "Summarizing..." and disables the button while pending', async () => {
		mockedPost.mockReturnValue(new Promise(() => {})); // never resolves

		renderTicketDetail();

		fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));

		expect(
			await screen.findByRole('button', { name: 'Summarizing...' }),
		).toBeDisabled();
	});

	it('regenerates the summary on every click', async () => {
		mockedPost
			.mockResolvedValueOnce({ data: { summary: 'First summary.' } })
			.mockResolvedValueOnce({ data: { summary: 'Second summary.' } });

		renderTicketDetail();

		fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));
		expect(await screen.findByText('First summary.')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));
		expect(await screen.findByText('Second summary.')).toBeInTheDocument();
		expect(screen.queryByText('First summary.')).not.toBeInTheDocument();
		expect(mockedPost).toHaveBeenCalledTimes(2);
	});

	it('shows the server error message when summarizing fails', async () => {
		mockedIsAxiosError.mockReturnValue(true);
		mockedPost.mockRejectedValue({
			isAxiosError: true,
			response: { data: { error: 'Failed to summarize ticket.' } },
		});

		renderTicketDetail();

		fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));

		expect(
			await screen.findByText('Failed to summarize ticket.'),
		).toBeInTheDocument();
	});

	it('shows a generic error message when summarizing fails for a non-axios reason', async () => {
		mockedIsAxiosError.mockReturnValue(false);
		mockedPost.mockRejectedValue(new Error('network error'));

		renderTicketDetail();

		fireEvent.click(screen.getByRole('button', { name: /Summarize/ }));

		expect(
			await screen.findByText('Failed to summarize ticket.'),
		).toBeInTheDocument();
	});
});
