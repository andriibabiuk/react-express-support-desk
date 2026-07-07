import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { defaultPageSize, TicketCategory, TicketStatus } from 'core';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { TicketsTable } from './TicketsTable';

function selectOption(triggerName: string, optionName: string) {
	fireEvent.click(screen.getByRole('combobox', { name: triggerName }));
	fireEvent.click(screen.getByRole('option', { name: optionName }));
}

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

const PAGINATION = { page: 1, pageSize: defaultPageSize, total: TICKETS.length, totalPages: 1 };

function mockTicketsResponse(overrides?: Partial<typeof PAGINATION>) {
	mockedGet.mockResolvedValue({
		data: { tickets: TICKETS, pagination: { ...PAGINATION, ...overrides } },
	});
}

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
		mockTicketsResponse();

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

	it('requests all tickets with no status/category filter by default', async () => {
		mockTicketsResponse();

		renderWithQuery(<TicketsTable />);

		await screen.findByText('Refund question');

		expect(mockedGet).toHaveBeenCalledWith('/api/tickets', {
			params: {
				sortBy: 'createdAt',
				sortOrder: 'desc',
				status: undefined,
				category: undefined,
				page: 1,
				pageSize: defaultPageSize,
			},
		});
	});

	it('refetches with the chosen status when a status filter is selected', async () => {
		mockTicketsResponse();

		renderWithQuery(<TicketsTable />);
		await screen.findByText('Refund question');

		selectOption('Status', 'Resolved');

		await waitFor(() => {
			expect(mockedGet).toHaveBeenLastCalledWith('/api/tickets', {
				params: {
					sortBy: 'createdAt',
					sortOrder: 'desc',
					status: 'resolved',
					category: undefined,
					page: 1,
					pageSize: defaultPageSize,
				},
			});
		});
	});

	it('refetches with the chosen category when a category filter is selected', async () => {
		mockTicketsResponse();

		renderWithQuery(<TicketsTable />);
		await screen.findByText('Refund question');

		selectOption('Category', 'Uncategorized');

		await waitFor(() => {
			expect(mockedGet).toHaveBeenLastCalledWith('/api/tickets', {
				params: {
					sortBy: 'createdAt',
					sortOrder: 'desc',
					status: undefined,
					category: 'uncategorized',
					page: 1,
					pageSize: defaultPageSize,
				},
			});
		});
	});

	it('debounces the search box before refetching with the typed term', async () => {
		mockTicketsResponse();

		renderWithQuery(<TicketsTable />);
		await screen.findByText('Refund question');

		fireEvent.change(screen.getByPlaceholderText('Search subject, sender, or email...'), {
			target: { value: 'refund' },
		});

		// Not sent immediately — still debouncing.
		expect(mockedGet).not.toHaveBeenLastCalledWith(
			'/api/tickets',
			expect.objectContaining({ params: expect.objectContaining({ search: 'refund' }) }),
		);

		await waitFor(() => {
			expect(mockedGet).toHaveBeenLastCalledWith('/api/tickets', {
				params: {
					sortBy: 'createdAt',
					sortOrder: 'desc',
					status: undefined,
					category: undefined,
					search: 'refund',
					page: 1,
					pageSize: defaultPageSize,
				},
			});
		});
	});

	it('shows the ticket count and page indicator, with Previous disabled on the first page', async () => {
		mockTicketsResponse({ page: 1, total: 45, totalPages: 3 });

		renderWithQuery(<TicketsTable />);
		await screen.findByText('Refund question');

		expect(screen.getByText('45 tickets')).toBeInTheDocument();
		expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
	});

	it('requests the next page when Next is clicked, and disables Next on the last page', async () => {
		mockTicketsResponse({ page: 1, total: 45, totalPages: 3 });

		renderWithQuery(<TicketsTable />);
		await screen.findByText('Refund question');

		mockTicketsResponse({ page: 2, total: 45, totalPages: 3 });
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => {
			expect(mockedGet).toHaveBeenLastCalledWith('/api/tickets', {
				params: {
					sortBy: 'createdAt',
					sortOrder: 'desc',
					status: undefined,
					category: undefined,
					page: 2,
					pageSize: defaultPageSize,
				},
			});
		});
		expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();

		mockTicketsResponse({ page: 3, total: 45, totalPages: 3 });
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
	});

	it('resets to page 1 when a filter changes', async () => {
		mockTicketsResponse({ page: 1, total: 45, totalPages: 3 });

		renderWithQuery(<TicketsTable />);
		await screen.findByText('Refund question');

		mockTicketsResponse({ page: 2, total: 45, totalPages: 3 });
		fireEvent.click(screen.getByRole('button', { name: 'Next' }));
		await screen.findByText('Page 2 of 3');

		mockTicketsResponse({ page: 1, total: 3, totalPages: 1 });
		selectOption('Status', 'Resolved');

		await waitFor(() => {
			expect(mockedGet).toHaveBeenLastCalledWith('/api/tickets', {
				params: {
					sortBy: 'createdAt',
					sortOrder: 'desc',
					status: 'resolved',
					category: undefined,
					page: 1,
					pageSize: defaultPageSize,
				},
			});
		});
	});
});
