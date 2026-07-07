import { screen } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { TicketReplies } from './TicketReplies';

vi.mock('axios', () => ({
	default: { get: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;

const REPLIES = [
	{
		id: 1,
		body: 'Thanks for reaching out, looking into it.',
		author: { id: 'agent-1', name: 'Alex Agent', email: 'alex@example.com' },
		createdAt: '2026-01-16T00:00:00.000Z',
	},
	{
		id: 2,
		body: 'Any update?',
		author: null,
		createdAt: '2026-01-17T00:00:00.000Z',
	},
];

function expectedDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

describe('TicketReplies', () => {
	afterEach(() => {
		mockedGet.mockReset();
	});

	it('shows a loading state while the request is pending', () => {
		mockedGet.mockReturnValue(new Promise(() => {})); // never resolves

		renderWithQuery(<TicketReplies ticketId={1} />);

		expect(screen.getByText('Replies')).toBeInTheDocument();
		expect(screen.queryByText('No replies yet.')).not.toBeInTheDocument();
	});

	it('shows "No replies yet." when there are no replies', async () => {
		mockedGet.mockResolvedValue({ data: { replies: [] } });

		renderWithQuery(<TicketReplies ticketId={1} />);

		expect(await screen.findByText('No replies yet.')).toBeInTheDocument();
	});

	it('renders each reply with its author, date, and body', async () => {
		mockedGet.mockResolvedValue({ data: { replies: REPLIES } });

		renderWithQuery(<TicketReplies ticketId={1} />);

		expect(await screen.findByText('Alex Agent')).toBeInTheDocument();
		expect(
			screen.getByText('Thanks for reaching out, looking into it.'),
		).toBeInTheDocument();
		expect(screen.getByText(expectedDate(REPLIES[0].createdAt))).toBeInTheDocument();

		// A reply with no author (a customer reply) falls back to "Customer".
		expect(screen.getByText('Customer')).toBeInTheDocument();
		expect(screen.getByText('Any update?')).toBeInTheDocument();
	});

	it('renders bodyHtml when present instead of the plain-text body', async () => {
		mockedGet.mockResolvedValue({
			data: {
				replies: [
					{
						id: 3,
						body: 'Line one\nLine two',
						bodyHtml: 'Line one<br>Line two',
						author: null,
						createdAt: '2026-01-18T00:00:00.000Z',
					},
				],
			},
		});

		const { container } = renderWithQuery(<TicketReplies ticketId={1} />);

		await screen.findByText('Customer');
		expect(container.querySelector('br')).toBeInTheDocument();
		expect(container.textContent).toContain('Line oneLine two');
	});

	it('sanitizes bodyHtml before rendering it', async () => {
		mockedGet.mockResolvedValue({
			data: {
				replies: [
					{
						id: 4,
						body: 'hi',
						bodyHtml: '<img src=x onerror="alert(1)"><script>alert(1)</script>hi',
						author: null,
						createdAt: '2026-01-18T00:00:00.000Z',
					},
				],
			},
		});

		const { container } = renderWithQuery(<TicketReplies ticketId={1} />);

		await screen.findByText('Customer');
		expect(container.querySelector('script')).not.toBeInTheDocument();
		expect(container.querySelector('img')).not.toHaveAttribute('onerror');
		expect(container.textContent).toContain('hi');
	});

	it('shows an error message when the request fails', async () => {
		mockedGet.mockRejectedValue(new Error('network error'));

		renderWithQuery(<TicketReplies ticketId={1} />);

		expect(await screen.findByText('Failed to load replies.')).toBeInTheDocument();
	});

	it('does not request replies for an invalid ticket id', () => {
		renderWithQuery(<TicketReplies ticketId={NaN} />);

		expect(mockedGet).not.toHaveBeenCalled();
	});
});
