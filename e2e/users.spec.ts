import { expect, test } from './fixtures';
import { loginAsAdmin } from './helpers';

// Fixed in server/prisma/seed.ts (not env-configurable like the email/
// password), so it's safe to hardcode as the one row we know exists without
// any test creating it first.
const SEEDED_ADMIN_NAME = 'Admin';

test.describe('User management (admin)', () => {
	test.beforeEach(async ({ loginPage, usersPage }) => {
		await loginAsAdmin(loginPage);
		await usersPage.goto();
	});

	test('lists the seeded admin, who has no Delete action', async ({ usersPage }) => {
		// DeleteUserDialog renders nothing at all for role: admin rows (admins
		// can't be deleted through this UI), so this is the "read" happy path
		// plus a check that the seeded admin's row reflects that rule.
		await expect(usersPage.row(SEEDED_ADMIN_NAME)).toBeVisible();
		await expect(usersPage.row(SEEDED_ADMIN_NAME)).toContainText('admin');
		await expect(usersPage.deleteButton(SEEDED_ADMIN_NAME)).toHaveCount(0);
	});

	test('creates, edits, and deletes a user end to end', async ({ usersPage }) => {
		const unique = Date.now();
		const createdName = `E2E User ${unique}`;
		const createdEmail = `e2e-user-${unique}@example.com`;
		const password = 'password123';

		await test.step('create a user', async () => {
			await usersPage.openCreateDialog();
			await expect(usersPage.userDialog.dialog).toHaveAccessibleName('Create user');

			await usersPage.userDialog.fill({ name: createdName, email: createdEmail, password });
			await usersPage.userDialog.submit();

			// Dialog closes and query invalidation brings the new row into the table.
			await expect(usersPage.userDialog.dialog).toBeHidden();
			await expect(usersPage.row(createdName)).toBeVisible();
			// No client-side role picker exists — every user created through this
			// UI defaults to role "agent" server-side.
			await expect(usersPage.row(createdName)).toContainText('agent');
		});

		const updatedName = `Updated User ${unique}`;
		const updatedEmail = `updated-user-${unique}@example.com`;

		await test.step('edits the user, leaving the password untouched', async () => {
			await usersPage.openEditDialog(createdName);
			await expect(usersPage.userDialog.dialog).toHaveAccessibleName('Edit user');

			// Pre-filled with the row's current Name/Email; Password starts blank.
			await expect(usersPage.userDialog.nameInput).toHaveValue(createdName);
			await expect(usersPage.userDialog.emailInput).toHaveValue(createdEmail);
			await expect(usersPage.userDialog.passwordInput).toHaveValue('');
			await expect(usersPage.userDialog.passwordInput).toHaveAttribute(
				'placeholder',
				'Leave blank to keep current password',
			);

			// Change name/email but deliberately leave password blank — this
			// should keep the existing password rather than clearing it.
			await usersPage.userDialog.fill({ name: updatedName, email: updatedEmail });
			await usersPage.userDialog.submit();

			await expect(usersPage.userDialog.dialog).toBeHidden();
			await expect(usersPage.row(updatedName)).toBeVisible();
			await expect(usersPage.row(createdName)).toHaveCount(0);
		});

		await test.step('deletes the user', async () => {
			await usersPage.openDeleteDialog(updatedName);
			await expect(usersPage.deleteUserDialog.dialog).toHaveAccessibleName(
				`Delete ${updatedName}?`,
			);

			await usersPage.deleteUserDialog.confirm();

			// Dialog closes and the (soft-deleted) row disappears from the list.
			await expect(usersPage.deleteUserDialog.dialog).toBeHidden();
			await expect(usersPage.row(updatedName)).toHaveCount(0);
		});
	});
});
