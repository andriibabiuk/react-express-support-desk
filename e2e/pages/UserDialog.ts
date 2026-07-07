import type { Locator, Page } from '@playwright/test';

/**
 * client/src/components/UserDialog.tsx — one Radix Dialog that drives both
 * create mode (triggered by UsersPage's "New user" button) and edit mode
 * (triggered by a row's Edit button in UsersTable). This object models only
 * the dialog's own contents (fields/submit) since the two triggers live in
 * different places on the page — UsersPage is responsible for opening it.
 */
export class UserDialog {
	readonly page: Page;
	readonly dialog: Locator;
	readonly nameInput: Locator;
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.dialog = page.getByRole('dialog');
		this.nameInput = this.dialog.getByLabel('Name');
		this.emailInput = this.dialog.getByLabel('Email');
		this.passwordInput = this.dialog.getByLabel('Password');
		// The button's accessible name toggles between "Create user"/"Creating…"
		// (create mode) and "Save changes"/"Saving…" (edit mode), so match by
		// role within the dialog rather than a fixed name — it's the only
		// button in the form (the corner "Close" icon button has its own fixed
		// name, so there's no ambiguity).
		this.submitButton = this.dialog.getByRole('button', {
			name: /^(Create user|Creating…|Save changes|Saving…)$/,
		});
	}

	/** Fills whichever of the shared Name/Email/Password fields are given, the way a real user would. Omit password to leave it untouched (edit mode: keeps the existing password). */
	async fill(values: { name?: string; email?: string; password?: string }) {
		if (values.name !== undefined) await this.nameInput.fill(values.name);
		if (values.email !== undefined) await this.emailInput.fill(values.email);
		if (values.password !== undefined) await this.passwordInput.fill(values.password);
	}

	async submit() {
		await this.submitButton.click();
	}
}
