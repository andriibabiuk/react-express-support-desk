import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { Role } from 'core';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { DeleteUserDialog } from './DeleteUserDialog';
import type { User } from './UsersTable';

vi.mock('axios', () => ({
	default: { delete: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedDelete = axios.delete as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

const AGENT: User = {
	id: 'user-1',
	name: 'Jane Doe',
	email: 'jane@example.com',
	role: Role.agent,
	createdAt: '2026-01-01T00:00:00.000Z',
};

const ADMIN: User = {
	id: 'admin-1',
	name: 'Ada Admin',
	email: 'ada@example.com',
	role: Role.admin,
	createdAt: '2026-01-01T00:00:00.000Z',
};

function openDialog() {
	fireEvent.click(screen.getByRole('button', { name: `Delete ${AGENT.name}` }));
}

describe('DeleteUserDialog', () => {
	afterEach(() => {
		mockedDelete.mockReset();
		mockedIsAxiosError.mockReset();
	});

	it('renders nothing for an admin user', () => {
		const { container } = renderWithQuery(<DeleteUserDialog user={ADMIN} />);

		expect(container).toBeEmptyDOMElement();
	});

	it('does not render the confirmation until the trigger button is clicked', () => {
		renderWithQuery(<DeleteUserDialog user={AGENT} />);

		expect(
			screen.getByRole('button', { name: `Delete ${AGENT.name}` }),
		).toBeInTheDocument();
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
	});

	it('shows the confirmation when the trigger button is clicked', () => {
		renderWithQuery(<DeleteUserDialog user={AGENT} />);

		openDialog();

		expect(screen.getByRole('alertdialog')).toBeInTheDocument();
		expect(screen.getByText('Delete Jane Doe?')).toBeInTheDocument();
	});

	it('closes without deleting when Cancel is clicked', () => {
		renderWithQuery(<DeleteUserDialog user={AGENT} />);

		openDialog();
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
		expect(mockedDelete).not.toHaveBeenCalled();
	});

	it('deletes the user and closes the dialog on confirm', async () => {
		mockedDelete.mockResolvedValue({});

		renderWithQuery(<DeleteUserDialog user={AGENT} />);

		openDialog();
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

		await waitFor(() => {
			expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
		});

		expect(mockedDelete).toHaveBeenCalledWith(`/api/users/${AGENT.id}`);
	});

	it('shows the server error message and keeps the dialog open when the request fails', async () => {
		mockedIsAxiosError.mockReturnValue(true);
		mockedDelete.mockRejectedValue({
			isAxiosError: true,
			response: { data: { error: 'Admin users cannot be deleted.' } },
		});

		renderWithQuery(<DeleteUserDialog user={AGENT} />);

		openDialog();
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

		expect(
			await screen.findByText('Admin users cannot be deleted.'),
		).toBeInTheDocument();
		expect(screen.getByRole('alertdialog')).toBeInTheDocument();
	});

	it('shows a generic error message when the failure is not an axios error', async () => {
		mockedIsAxiosError.mockReturnValue(false);
		mockedDelete.mockRejectedValue(new Error('network error'));

		renderWithQuery(<DeleteUserDialog user={AGENT} />);

		openDialog();
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

		expect(await screen.findByText('Failed to delete user.')).toBeInTheDocument();
		expect(screen.getByRole('alertdialog')).toBeInTheDocument();
	});
});
