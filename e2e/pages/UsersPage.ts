import type { Locator, Page } from '@playwright/test';
import { DeleteUserDialog } from './DeleteUserDialog';
import { NavBar } from './NavBar';
import { UserDialog } from './UserDialog';

/**
 * client/src/pages/UsersPage.tsx, rendered at "/users" behind both
 * ProtectedRoute and AdminRoute (admin-only). Composes the UserDialog and
 * DeleteUserDialog component objects (client/src/components/UsersTable.tsx
 * renders one of each per row) rather than duplicating their locators here.
 */
export class UsersPage {
	readonly page: Page;
	readonly navBar: NavBar;
	readonly heading: Locator;
	readonly newUserButton: Locator;
	readonly userDialog: UserDialog;
	readonly deleteUserDialog: DeleteUserDialog;

	constructor(page: Page) {
		this.page = page;
		this.navBar = new NavBar(page);
		this.heading = page.getByRole('heading', { name: 'Users' });
		this.newUserButton = page.getByRole('button', { name: 'New user' });
		this.userDialog = new UserDialog(page);
		this.deleteUserDialog = new DeleteUserDialog(page);
	}

	async goto() {
		await this.page.goto('/users');
	}

	/**
	 * The table row containing the given user's name. Playwright's role
	 * locator matches accessible-name substrings, so this also matches on the
	 * row's Edit/Delete button aria-labels ("Edit {name}"/"Delete {name}") —
	 * harmless, since both already contain the same name text.
	 */
	row(name: string): Locator {
		return this.page.getByRole('row', { name });
	}

	editButton(name: string): Locator {
		return this.page.getByRole('button', { name: `Edit ${name}` });
	}

	deleteButton(name: string): Locator {
		return this.page.getByRole('button', { name: `Delete ${name}` });
	}

	async openCreateDialog() {
		await this.newUserButton.click();
	}

	async openEditDialog(name: string) {
		await this.editButton(name).click();
	}

	async openDeleteDialog(name: string) {
		await this.deleteButton(name).click();
	}
}
