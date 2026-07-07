import { screen, within } from '@testing-library/react';
import axios from 'axios';
import { TicketCategory, TicketStatus } from 'core';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { TicketsTable } from './TicketsTable';

vi.mock('axios', () => ({
	default: { get: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;

const TICKETS = [
	{
		id: 2,
		subject: 'Refund question',
		senderEmail: 'sam@example.com',
		senderName: 'Sam Student',
		status: TicketStatus.open,
		category: null,
		createdAt: '2026-02-20T00:00:00.000Z',
	},
	{
		id: 1,
		subject: 'How do I reset my password?',
		senderEmail: 'jane@example.com',
		senderName: 'Jane Doe',
		status: TicketStatus.resolved,
		category: TicketCategory.technicalQuestion,
		createdAt: '2026-01-15T00:00:00.000Z',
	},
];

function expectedDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

describe('TicketsTable', () => {
	afterEach(() => {
		mockedGet.mockReset();
	});

	it('shows a skeleton table while the request is pending', () => {
		mockedGet.mockReturnValue(new Promise(() => {})); // never resolves

		renderWithQuery(<TicketsTable />);

		// 1 header row + the 5 skeleton placeholder rows, no real data yet.
		expect(screen.getAllByRole('row')).toHaveLength(6);
		expect(screen.queryByText(TICKETS[0].subject)).not.toBeInTheDocument();
	});

	it('renders the ticket list once the request resolves, newest first as returned by the API', async () => {
		mockedGet.mockResolvedValue({ data: { tickets: TICKETS } });

		renderWithQuery(<TicketsTable />);

		expect(await screen.findByText('Refund question')).toBeInTheDocument();

		expect(
			screen.getByRole('columnheader', { name: 'Created' }),
		).toBeInTheDocument();

		const rows = screen.getAllByRole('row');
		expect(rows).toHaveLength(1 + TICKETS.length);

		// The API is expected to already return tickets newest-first — the
		// component just renders in the order given, so row order should
		// match TICKETS' order exactly (id 2 before id 1).
		const firstRow = within(rows[1]);
		expect(firstRow.getByText('Refund question')).toBeInTheDocument();
		expect(firstRow.getByText('Sam Student')).toBeInTheDocument();
		expect(firstRow.getByText('sam@example.com')).toBeInTheDocument();
		expect(firstRow.getByText('Open')).toBeInTheDocument();
		expect(firstRow.getByText('Uncategorized')).toBeInTheDocument();
		expect(firstRow.getByText(expectedDate(TICKETS[0].createdAt))).toBeInTheDocument();

		const secondRow = within(rows[2]);
		expect(secondRow.getByText('How do I reset my password?')).toBeInTheDocument();
		expect(secondRow.getByText('Jane Doe')).toBeInTheDocument();
		expect(secondRow.getByText('Resolved')).toBeInTheDocument();
		expect(secondRow.getByText('Technical Question')).toBeInTheDocument();
	});

	it('shows an error message when the request fails', async () => {
		mockedGet.mockRejectedValue(new Error('network error'));

		renderWithQuery(<TicketsTable />);

		expect(await screen.findByText('Failed to load tickets.')).toBeInTheDocument();
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
	});
});
