import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { CreateUserDialog } from './CreateUserDialog';

vi.mock('axios', () => ({
	default: { post: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedPost = axios.post as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

function fillForm({
	name = 'Jane Doe',
	email = 'jane@example.com',
	password = 'password123',
}: { name?: string; email?: string; password?: string } = {}) {
	fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
	fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
	fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

function submit() {
	fireEvent.click(screen.getByRole('button', { name: 'Create user' }));
}

describe('CreateUserDialog', () => {
	afterEach(() => {
		mockedPost.mockReset();
		mockedIsAxiosError.mockReset();
	});

	it('does not render the dialog until the trigger button is clicked', () => {
		renderWithQuery(<CreateUserDialog />);

		expect(screen.getByRole('button', { name: 'New user' })).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('shows the dialog when the trigger button is clicked', () => {
		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(
			screen.getByText('Add a new agent to the support desk.'),
		).toBeInTheDocument();
	});

	it('hides the dialog when Escape is pressed', async () => {
		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	it('hides the dialog when clicking outside of it', async () => {
		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));
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
		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));
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

		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));
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

		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));
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

		renderWithQuery(<CreateUserDialog />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));
		fillForm();
		submit();

		expect(await screen.findByText('Failed to create user.')).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});
});
