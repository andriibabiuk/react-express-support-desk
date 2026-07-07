import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { TicketAssigneeSelect } from './TicketAssigneeSelect';

vi.mock('axios', () => ({
	default: { get: vi.fn(), patch: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;
const mockedPatch = axios.patch as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

const ASSIGNEES = [
	{ id: 'agent-1', name: 'Alex Agent', email: 'alex@example.com' },
	{ id: 'agent-2', name: 'Bailey Agent', email: 'bailey@example.com' },
];

// Opens the select and waits for `optionName` to appear before clicking it —
// the assignee list is fetched asynchronously, so it may not be in the DOM
// yet at the moment the trigger is clicked.
async function selectAssignee(optionName: string) {
	fireEvent.click(screen.getByRole('combobox', { name: 'Assigned to' }));
	fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('TicketAssigneeSelect', () => {
	afterEach(() => {
		mockedGet.mockReset();
		mockedPatch.mockReset();
		mockedIsAxiosError.mockReset();
	});

	it('shows "Unassigned" and lists the fetched assignees once loaded', async () => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });

		renderWithQuery(<TicketAssigneeSelect ticketId={1} assignedToId={null} />);

		expect(screen.getByText('Unassigned')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('combobox', { name: 'Assigned to' }));
		expect(await screen.findByRole('option', { name: 'Alex Agent' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Bailey Agent' })).toBeInTheDocument();
	});

	it("shows the assigned agent's name when already assigned", async () => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });

		renderWithQuery(<TicketAssigneeSelect ticketId={1} assignedToId='agent-1' />);

		expect(await screen.findByText('Alex Agent')).toBeInTheDocument();
	});

	it('assigns the ticket to the selected agent', async () => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });
		mockedPatch.mockResolvedValue({});

		renderWithQuery(<TicketAssigneeSelect ticketId={1} assignedToId={null} />);

		await selectAssignee('Alex Agent');

		await waitFor(() => {
			expect(mockedPatch).toHaveBeenCalledWith('/api/tickets/1', {
				assignedToId: 'agent-1',
			});
		});
	});

	it('unassigns the ticket when "Unassigned" is selected', async () => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });
		mockedPatch.mockResolvedValue({});

		renderWithQuery(<TicketAssigneeSelect ticketId={1} assignedToId='agent-1' />);
		await screen.findByText('Alex Agent');

		await selectAssignee('Unassigned');

		await waitFor(() => {
			expect(mockedPatch).toHaveBeenCalledWith('/api/tickets/1', {
				assignedToId: null,
			});
		});
	});

	it('shows the server error message when assignment fails', async () => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });
		mockedIsAxiosError.mockReturnValue(true);
		mockedPatch.mockRejectedValue({
			isAxiosError: true,
			response: { data: { error: 'Ticket can only be assigned to an active agent' } },
		});

		renderWithQuery(<TicketAssigneeSelect ticketId={1} assignedToId={null} />);

		await selectAssignee('Alex Agent');

		expect(
			await screen.findByText('Ticket can only be assigned to an active agent'),
		).toBeInTheDocument();
	});

	it('shows a generic error message when the failure is not an axios error', async () => {
		mockedGet.mockResolvedValue({ data: { assignees: ASSIGNEES } });
		mockedIsAxiosError.mockReturnValue(false);
		mockedPatch.mockRejectedValue(new Error('network error'));

		renderWithQuery(<TicketAssigneeSelect ticketId={1} assignedToId={null} />);

		await selectAssignee('Alex Agent');

		expect(await screen.findByText('Failed to assign ticket.')).toBeInTheDocument();
	});
});
