import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { UserDialog } from './UserDialog';
import type { User } from './UsersTable';

vi.mock('axios', () => ({
	default: { post: vi.fn(), patch: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedPost = axios.post as unknown as Mock;
const mockedPatch = axios.patch as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

const USER: User = {
	id: 'user-1',
	name: 'Jane Doe',
	email: 'jane@example.com',
	role: 'agent',
	createdAt: '2026-01-01T00:00:00.000Z',
};

function fillForm({
	name = 'Jane Doe',
	email = 'jane@example.com',
	password = 'password123',
}: { name?: string; email?: string; password?: string } = {}) {
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
	fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
	fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

describe('UserDialog', () => {
	afterEach(() => {
		mockedPost.mockReset();
		mockedPatch.mockReset();
		mockedIsAxiosError.mockReset();
	});

	describe('create mode', () => {
		function openDialog() {
			fireEvent.click(screen.getByRole('button', { name: 'New user' }));
		}

		function submit() {
			fireEvent.click(screen.getByRole('button', { name: 'Create user' }));
		}

		it('does not render the dialog until the trigger button is clicked', () => {
			renderWithQuery(<UserDialog mode='create' />);

			expect(screen.getByRole('button', { name: 'New user' })).toBeInTheDocument();
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('shows the dialog when the trigger button is clicked', () => {
			renderWithQuery(<UserDialog mode='create' />);

			openDialog();

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(
				screen.getByText('Add a new agent to the support desk.'),
			).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toHaveValue('');
		});

		it('hides the dialog when Escape is pressed', async () => {
			renderWithQuery(<UserDialog mode='create' />);

			openDialog();
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('hides the dialog when clicking outside of it', async () => {
			renderWithQuery(<UserDialog mode='create' />);

			openDialog();
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			// Radix's dismissable layer defers registering its outside-pointerdown
			// listener by a `setTimeout(0)` (so the click that opened the dialog
			// isn't itself treated as an outside click), and then defers dismissal
			// to the `click` that follows the outside `pointerdown` (so a
			// text-selection drag ending outside the dialog doesn't close it) —
			// a real macrotask tick plus both events are needed to reproduce it.
			await new Promise(resolve => setTimeout(resolve, 0));
			fireEvent.pointerDown(document.body);
			fireEvent.click(document.body);

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('shows validation errors and does not submit when the form is empty', async () => {
			renderWithQuery(<UserDialog mode='create' />);

			openDialog();
			submit();

			expect(
				await screen.findByText('Name must be at least 3 characters'),
			).toBeInTheDocument();
			expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
			expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
			expect(mockedPost).not.toHaveBeenCalled();
		});

		it('submits the form and closes the dialog on success', async () => {
			mockedPost.mockResolvedValue({ data: { user: { id: '1' } } });

			renderWithQuery(<UserDialog mode='create' />);

			openDialog();
			fillForm();
			submit();

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(mockedPost).toHaveBeenCalledWith('/api/users', {
				name: 'Jane Doe',
				email: 'jane@example.com',
				password: 'password123',
			});
		});

		it('shows the server error message and keeps the dialog open when the request fails', async () => {
			mockedIsAxiosError.mockReturnValue(true);
			mockedPost.mockRejectedValue({
				isAxiosError: true,
				response: { data: { error: 'A user with this email already exists.' } },
			});

			renderWithQuery(<UserDialog mode='create' />);

			openDialog();
			fillForm();
			submit();

			expect(
				await screen.findByText('A user with this email already exists.'),
			).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('shows a generic error message when the failure is not an axios error', async () => {
			mockedIsAxiosError.mockReturnValue(false);
			mockedPost.mockRejectedValue(new Error('network error'));

			renderWithQuery(<UserDialog mode='create' />);

			openDialog();
			fillForm();
			submit();

			expect(await screen.findByText('Failed to create user.')).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});
	});

	describe('edit mode', () => {
		function openDialog() {
			fireEvent.click(screen.getByRole('button', { name: `Edit ${USER.name}` }));
		}

		function submit() {
			fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
		}

		it('does not render the dialog until the trigger button is clicked', () => {
			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			expect(
				screen.getByRole('button', { name: `Edit ${USER.name}` }),
			).toBeInTheDocument();
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('shows the dialog pre-filled with the user data when the trigger is clicked', () => {
			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toHaveValue(USER.name);
			expect(screen.getByLabelText('Email')).toHaveValue(USER.email);
			expect(screen.getByLabelText('Password')).toHaveValue('');
		});

		it('hides the dialog when Escape is pressed', async () => {
			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('hides the dialog when clicking outside of it', async () => {
			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			// See the create-mode test above for why both a macrotask tick and a
			// pointerdown+click pair are needed to simulate an outside click.
			await new Promise(resolve => setTimeout(resolve, 0));
			fireEvent.pointerDown(document.body);
			fireEvent.click(document.body);

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
		});

		it('shows a validation error and does not submit when the new password is too short', async () => {
			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
			submit();

			expect(
				await screen.findByText('Password must be at least 8 characters'),
			).toBeInTheDocument();
			expect(mockedPatch).not.toHaveBeenCalled();
		});

		it('submits the form without a password when the password field is left blank', async () => {
			mockedPatch.mockResolvedValue({ data: { user: USER } });

			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Renamed' } });
			submit();

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(mockedPatch).toHaveBeenCalledWith(`/api/users/${USER.id}`, {
				name: 'Jane Renamed',
				email: USER.email,
				password: '',
			});
		});

		it('submits the new password when one is provided', async () => {
			mockedPatch.mockResolvedValue({ data: { user: USER } });

			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			fireEvent.change(screen.getByLabelText('Password'), {
				target: { value: 'newpassword456' },
			});
			submit();

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(mockedPatch).toHaveBeenCalledWith(`/api/users/${USER.id}`, {
				name: USER.name,
				email: USER.email,
				password: 'newpassword456',
			});
		});

		it('shows the server error message and keeps the dialog open when the request fails', async () => {
			mockedIsAxiosError.mockReturnValue(true);
			mockedPatch.mockRejectedValue({
				isAxiosError: true,
				response: { data: { error: 'A user with this email already exists.' } },
			});

			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			submit();

			expect(
				await screen.findByText('A user with this email already exists.'),
			).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('shows a generic error message when the failure is not an axios error', async () => {
			mockedIsAxiosError.mockReturnValue(false);
			mockedPatch.mockRejectedValue(new Error('network error'));

			renderWithQuery(<UserDialog mode='edit' user={USER} />);

			openDialog();
			submit();

			expect(await screen.findByText('Failed to update user.')).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});
	});
});
