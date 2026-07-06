import type { Locator, Page } from '@playwright/test';
import { NavBar } from './NavBar';

/**
 * client/src/pages/UsersPage.tsx, rendered at "/users" behind both
 * ProtectedRoute and AdminRoute (admin-only).
 */
export class UsersPage {
	readonly page: Page;
	readonly navBar: NavBar;
	readonly heading: Locator;

	constructor(page: Page) {
		this.page = page;
		this.navBar = new NavBar(page);
		this.heading = page.getByRole('heading', { name: 'Users' });
	}

	async goto() {
		await this.page.goto('/users');
	}
}
