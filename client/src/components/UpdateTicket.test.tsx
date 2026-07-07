import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { TicketCategory, TicketStatus } from 'core';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { UpdateTicket } from './UpdateTicket';

vi.mock('axios', () => ({
	default: { get: vi.fn(), patch: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;
const mockedPatch = axios.patch as unknown as Mock;

const ASSIGNEES = [{ id: 'agent-1', name: 'Alex Agent', email: 'alex@example.com' }];

// `role="combobox"` doesn't derive its accessible name from content per the
// ARIA accname spec, so — unlike `TicketAssigneeSelect`'s explicit
// `aria-label='Assigned to'` — the Status/Category `BadgeSelect`s can't be
// targeted by name. They're the first two comboboxes in DOM order (see the
// `<dl>` in `UpdateTicket.tsx`: Status, Category, Assigned to).
function selectStatusOrCategory(index: 0 | 1, optionLabel: string) {
	fireEvent.click(screen.getAllByRole('combobox')[index]);
	fireEvent.click(screen.getByRole('option', { name: optionLabel }));
}

function expectedDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

describe('UpdateTicket', () => {
	beforeEach(() => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });
	});

	afterEach(() => {
		mockedGet.mockReset();
		mockedPatch.mockReset();
	});

	it('renders the current status, category, assignee, and updated date', async () => {
		renderWithQuery(
			<UpdateTicket
				ticketId={1}
				status={TicketStatus.open}
				category={null}
				assignedTo={null}
				updatedAt='2026-01-20T00:00:00.000Z'
			/>,
		);

		expect(screen.getByText('Open')).toBeInTheDocument();
		expect(screen.getByText('Uncategorized')).toBeInTheDocument();
		expect(screen.getByText('Unassigned')).toBeInTheDocument();
		expect(
			screen.getByText(expectedDate('2026-01-20T00:00:00.000Z')),
		).toBeInTheDocument();
		// Let the background assignees fetch settle before the test unmounts.
		await waitFor(() => expect(mockedGet).toHaveBeenCalled());
	});

	it('shows the assigned agent and category when the ticket already has them', async () => {
		renderWithQuery(
			<UpdateTicket
				ticketId={1}
				status={TicketStatus.open}
				category={TicketCategory.refundRequest}
				assignedTo={{ id: 'agent-1', name: 'Alex Agent', email: 'alex@example.com' }}
				updatedAt='2026-01-20T00:00:00.000Z'
			/>,
		);

		expect(screen.getByText('Refund Request')).toBeInTheDocument();
		// The assignee's name only resolves once the assignees list (fetched
		// asynchronously) includes a matching entry for the Select to render.
		expect(await screen.findByText('Alex Agent')).toBeInTheDocument();
	});

	it('updates the status when a new one is selected', async () => {
		mockedPatch.mockResolvedValue({ data: {} });

		renderWithQuery(
			<UpdateTicket
				ticketId={1}
				status={TicketStatus.open}
				category={null}
				assignedTo={null}
				updatedAt='2026-01-20T00:00:00.000Z'
			/>,
		);

		selectStatusOrCategory(0, 'Resolved');

		await waitFor(() => {
			expect(mockedPatch).toHaveBeenCalledWith('/api/tickets/1', { status: 'resolved' });
		});
	});

	it('updates the category, sending null when Uncategorized is selected', async () => {
		mockedPatch.mockResolvedValue({ data: {} });

		renderWithQuery(
			<UpdateTicket
				ticketId={1}
				status={TicketStatus.open}
				category={TicketCategory.refundRequest}
				assignedTo={null}
				updatedAt='2026-01-20T00:00:00.000Z'
			/>,
		);

		selectStatusOrCategory(1, 'Uncategorized');

		await waitFor(() => {
			expect(mockedPatch).toHaveBeenCalledWith('/api/tickets/1', { category: null });
		});
	});

	it('assigns the ticket to the selected agent', async () => {
		mockedPatch.mockResolvedValue({});

		renderWithQuery(
			<UpdateTicket
				ticketId={1}
				status={TicketStatus.open}
				category={null}
				assignedTo={null}
				updatedAt='2026-01-20T00:00:00.000Z'
			/>,
		);

		fireEvent.click(screen.getByRole('combobox', { name: 'Assigned to' }));
		fireEvent.click(await screen.findByRole('option', { name: 'Alex Agent' }));

		await waitFor(() => {
			expect(mockedPatch).toHaveBeenCalledWith('/api/tickets/1', {
				assignedToId: 'agent-1',
			});
		});
	});
});
