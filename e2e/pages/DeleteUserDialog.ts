import type { Locator, Page } from '@playwright/test';

/**
 * client/src/components/DeleteUserDialog.tsx — a shadcn AlertDialog
 * (role="alertdialog", distinct from the regular "dialog" role used by
 * UserDialog) confirming a soft-delete. One exists per non-admin row in
 * UsersTable (admin rows render no Delete trigger at all), but only one can
 * be open at a time, so a single generic locator is enough.
 */
export class DeleteUserDialog {
	readonly page: Page;
	readonly dialog: Locator;
	readonly cancelButton: Locator;
	readonly confirmButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.dialog = page.getByRole('alertdialog');
		this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
		// Accessible name toggles "Delete" / "Deleting…" while the mutation is
		// in flight.
		this.confirmButton = this.dialog.getByRole('button', { name: /^(Delete|Deleting…)$/ });
	}

	async confirm() {
		await this.confirmButton.click();
	}

	async cancel() {
		await this.cancelButton.click();
	}
}
