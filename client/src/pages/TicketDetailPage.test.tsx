import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import axios from 'axios';
import { TicketStatus, type Ticket } from 'core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { TicketDetailPage } from './TicketDetailPage';

vi.mock('axios', () => ({
	default: { get: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

// `TicketDetailPage` calls `axios.isAxiosError(error)` on every render,
// including the initial one where `error` is `null` (before the query has
// settled) — a bare `mockReturnValue(true)` would make that first render
// treat `null` as an axios error and crash on `null.response`. Mirror the
// real implementation's null-safety instead.
function mockRealIsAxiosError() {
	mockedIsAxiosError.mockImplementation(
		(err: unknown) => Boolean(err && typeof err === 'object' && 'isAxiosError' in err),
	);
}

const TICKET: Ticket = {
	id: 1,
	subject: 'Refund question',
	body: 'Can I get a refund for my last order?',
	senderEmail: 'sam@example.com',
	senderName: 'Sam Student',
	status: TicketStatus.open,
	category: null,
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-01-16T00:00:00.000Z',
	assignedTo: null,
};

// The page and its children (TicketReplies, UpdateTicket's assignee list)
// each hit a different GET endpoint once the ticket loads, so one shared
// mock needs to route by URL rather than resolving to a single fixture.
function mockTicketDetailResponses() {
	mockedGet.mockImplementation((url: string) => {
		if (url === `/api/tickets/${TICKET.id}`) {
			return Promise.resolve({ data: TICKET });
		}
		if (url === `/api/tickets/${TICKET.id}/replies`) {
			return Promise.resolve({ data: { replies: [] } });
		}
		if (url === '/api/tickets/assignees') {
			return Promise.resolve({ data: { assignees: [] } });
		}
		return Promise.reject(new Error(`Unexpected GET ${url}`));
	});
}

function renderTicketDetailPage(ticketId: string | number = TICKET.id) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
				<Routes>
					<Route path='/tickets/:id' element={<TicketDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('TicketDetailPage', () => {
	afterEach(() => {
		mockedGet.mockReset();
		mockedIsAxiosError.mockReset();
	});

	it('shows a skeleton and the back link while the ticket is loading', () => {
		mockedGet.mockReturnValue(new Promise(() => {})); // never resolves

		const { container } = renderTicketDetailPage();

		expect(screen.getByRole('link', { name: 'Back to tickets' })).toBeInTheDocument();
		expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
		expect(screen.queryByText(TICKET.subject)).not.toBeInTheDocument();
	});

	it('shows "Ticket not found." for a 404 response', async () => {
		mockRealIsAxiosError();
		mockedGet.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

		renderTicketDetailPage();

		expect(await screen.findByText('Ticket not found.')).toBeInTheDocument();
	});

	it('shows a generic error message for a non-404 failure', async () => {
		mockRealIsAxiosError();
		mockedGet.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });

		renderTicketDetailPage();

		expect(await screen.findByText('Failed to load ticket.')).toBeInTheDocument();
	});

	it('does not request a ticket for an invalid id and shows the skeleton', () => {
		mockedGet.mockResolvedValue({ data: TICKET });

		const { container } = renderTicketDetailPage('not-a-number');

		expect(mockedGet).not.toHaveBeenCalled();
		expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
	});

	it('renders the ticket, replies, reply form, and details panel once loaded', async () => {
		mockTicketDetailResponses();

		renderTicketDetailPage();

		expect(await screen.findByText(TICKET.subject)).toBeInTheDocument();
		expect(
			screen.getByText(`${TICKET.senderName} <${TICKET.senderEmail}>`, { exact: false }),
		).toBeInTheDocument();
		expect(screen.getByText(TICKET.body)).toBeInTheDocument();

		// TicketReplies
		expect(await screen.findByText('No replies yet.')).toBeInTheDocument();

		// TicketReplyForm
		expect(screen.getByPlaceholderText('Type your reply here...')).toBeInTheDocument();

		// UpdateTicket
		expect(screen.getByText('Open')).toBeInTheDocument();
		expect(screen.getByText('Uncategorized')).toBeInTheDocument();
		expect(screen.getByText('Unassigned')).toBeInTheDocument();
	});
});
