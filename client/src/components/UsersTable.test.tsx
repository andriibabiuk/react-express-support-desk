import { screen, within } from '@testing-library/react';
import axios from 'axios';
import { Role } from 'core';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { UsersTable } from './UsersTable';

vi.mock('axios', () => ({
	default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockedGet = axios.get as unknown as Mock;

const USERS = [
	{
		id: '1',
		name: 'Ada Admin',
		email: 'ada@example.com',
		role: Role.admin,
		createdAt: '2026-01-15T00:00:00.000Z',
	},
	{
		id: '2',
		name: 'Alex Agent',
		email: 'alex@example.com',
		role: Role.agent,
		createdAt: '2026-02-20T00:00:00.000Z',
	},
];

function expectedDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

describe('UsersTable', () => {
	afterEach(() => {
		mockedGet.mockReset();
	});

	it('shows a skeleton table while the request is pending', () => {
		mockedGet.mockReturnValue(new Promise(() => {})); // never resolves

		renderWithQuery(<UsersTable />);

		// 1 header row + the 5 skeleton placeholder rows, no real data yet.
		expect(screen.getAllByRole('row')).toHaveLength(6);
		expect(screen.queryByText(USERS[0].email)).not.toBeInTheDocument();
	});

	it('renders the user list once the request resolves', async () => {
		mockedGet.mockResolvedValue({ data: { users: USERS } });

		renderWithQuery(<UsersTable />);

		expect(await screen.findByText('Ada Admin')).toBeInTheDocument();

		expect(
			screen.getByRole('columnheader', { name: 'Created' }),
		).toBeInTheDocument();

		const rows = screen.getAllByRole('row');
		expect(rows).toHaveLength(1 + USERS.length);

		const adminRow = within(rows[1]);
		expect(adminRow.getByText('Ada Admin')).toBeInTheDocument();
		expect(adminRow.getByText('ada@example.com')).toBeInTheDocument();
		expect(adminRow.getByText(Role.admin)).toBeInTheDocument();
		expect(adminRow.getByText(expectedDate(USERS[0].createdAt))).toBeInTheDocument();

		const agentRow = within(rows[2]);
		expect(agentRow.getByText('Alex Agent')).toBeInTheDocument();
		expect(agentRow.getByText(Role.agent)).toBeInTheDocument();

		expect(adminRow.getByRole('button', { name: `Edit ${USERS[0].name}` })).toBeInTheDocument();
		expect(agentRow.getByRole('button', { name: `Edit ${USERS[1].name}` })).toBeInTheDocument();

		// Admins can't be deleted, so no delete action renders for that row.
		expect(
			adminRow.queryByRole('button', { name: `Delete ${USERS[0].name}` }),
		).not.toBeInTheDocument();
		expect(
			agentRow.getByRole('button', { name: `Delete ${USERS[1].name}` }),
		).toBeInTheDocument();
	});

	it('shows an error message when the request fails', async () => {
		mockedGet.mockRejectedValue(new Error('network error'));

		renderWithQuery(<UsersTable />);

		expect(await screen.findByText('Failed to load users.')).toBeInTheDocument();
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
	});
});
