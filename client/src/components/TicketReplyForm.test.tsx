import { fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { TicketReplyForm } from './TicketReplyForm';

vi.mock('axios', () => ({
	default: { post: vi.fn(), isAxiosError: vi.fn() },
}));

const mockedPost = axios.post as unknown as Mock;
const mockedIsAxiosError = axios.isAxiosError as unknown as Mock;

function typeReply(body: string) {
	fireEvent.change(screen.getByPlaceholderText('Type your reply here...'), {
		target: { value: body },
	});
}

describe('TicketReplyForm', () => {
	afterEach(() => {
		mockedPost.mockReset();
		mockedIsAxiosError.mockReset();
	});

	it('disables the Reply button until a non-blank body is entered', () => {
		renderWithQuery(<TicketReplyForm ticketId={1} />);

		expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();

		typeReply('   ');
		expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();

		typeReply('Thanks for the update.');
		expect(screen.getByRole('button', { name: 'Reply' })).toBeEnabled();
	});

	it('submits the reply and clears the textarea on success', async () => {
		mockedPost.mockResolvedValue({
			data: {
				id: 3,
				body: 'Thanks for the update.',
				author: null,
				createdAt: '2026-01-18T00:00:00.000Z',
			},
		});

		renderWithQuery(<TicketReplyForm ticketId={1} />);

		typeReply('Thanks for the update.');
		fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

		await waitFor(() => {
			expect(mockedPost).toHaveBeenCalledWith('/api/tickets/1/replies', {
				body: 'Thanks for the update.',
			});
		});
		await waitFor(() => {
			expect(screen.getByPlaceholderText('Type your reply here...')).toHaveValue('');
		});
	});

	it('shows "Replying..." and disables the form while the request is pending', async () => {
		mockedPost.mockReturnValue(new Promise(() => {})); // never resolves

		renderWithQuery(<TicketReplyForm ticketId={1} />);

		typeReply('Thanks for the update.');
		fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

		expect(await screen.findByRole('button', { name: 'Replying...' })).toBeDisabled();
		expect(screen.getByPlaceholderText('Type your reply here...')).toBeDisabled();
	});

	it('shows the server error message and keeps the entered text when the request fails', async () => {
		mockedIsAxiosError.mockReturnValue(true);
		mockedPost.mockRejectedValue({
			isAxiosError: true,
			response: { data: { error: 'Ticket is closed.' } },
		});

		renderWithQuery(<TicketReplyForm ticketId={1} />);

		typeReply('Thanks for the update.');
		fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

		expect(await screen.findByText('Ticket is closed.')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Type your reply here...')).toHaveValue(
			'Thanks for the update.',
		);
	});

	it('shows a generic error message when the failure is not an axios error', async () => {
		mockedIsAxiosError.mockReturnValue(false);
		mockedPost.mockRejectedValue(new Error('network error'));

		renderWithQuery(<TicketReplyForm ticketId={1} />);

		typeReply('Thanks for the update.');
		fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

		expect(await screen.findByText('Failed to send reply.')).toBeInTheDocument();
	});
});
