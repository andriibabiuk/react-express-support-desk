import type { Locator, Page } from '@playwright/test';

/**
 * The NavBar is rendered by ProtectedRoute on every authenticated page
 * (client/src/components/NavBar.tsx), so it's modeled as a small component
 * object composed into each page object rather than duplicated.
 */
export class NavBar {
	readonly page: Page;
	readonly usersLink: Locator;
	readonly signOutButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.usersLink = page.getByRole('link', { name: 'Users' });
		this.signOutButton = page.getByRole('button', { name: 'Sign out' });
	}

	async signOut() {
		await this.signOutButton.click();
	}
}
