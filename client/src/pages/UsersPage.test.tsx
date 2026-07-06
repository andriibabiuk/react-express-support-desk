import { fireEvent, screen } from '@testing-library/react';
import axios from 'axios';
import { Role } from 'core';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { UsersPage } from './UsersPage';

vi.mock('axios', () => ({
	default: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;

describe('UsersPage', () => {
	afterEach(() => {
		mockedGet.mockReset();
	});

	it('renders the heading, the create-user trigger, and the users table', async () => {
		mockedGet.mockResolvedValue({
			data: {
				users: [
					{
						id: '1',
						name: 'Ada Admin',
						email: 'ada@example.com',
						role: Role.admin,
						createdAt: '2026-01-15T00:00:00.000Z',
					},
				],
			},
		});

		renderWithQuery(<UsersPage />);

		expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'New user' })).toBeInTheDocument();
		expect(await screen.findByText('Ada Admin')).toBeInTheDocument();
	});

	it('opens the create-user dialog from the page header', () => {
		mockedGet.mockReturnValue(new Promise(() => {})); // never resolves

		renderWithQuery(<UsersPage />);

		fireEvent.click(screen.getByRole('button', { name: 'New user' }));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(
			screen.getByText('Add a new agent to the support desk.'),
		).toBeInTheDocument();
	});
});
