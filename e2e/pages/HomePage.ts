import type { Locator, Page } from '@playwright/test';
import { NavBar } from './NavBar';

/** client/src/pages/HomePage.tsx, rendered at "/" behind ProtectedRoute. */
export class HomePage {
	readonly page: Page;
	readonly navBar: NavBar;
	/** CardTitle renders a <div>, not a heading, so this is matched by text. */
	readonly welcomeMessage: Locator;

	constructor(page: Page) {
		this.page = page;
		this.navBar = new NavBar(page);
		this.welcomeMessage = page.getByText(/^Welcome,/);
	}

	async goto() {
		await this.page.goto('/');
	}
}
