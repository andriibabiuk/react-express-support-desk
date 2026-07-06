import type { Locator, Page } from '@playwright/test';

/**
 * client/src/pages/LoginPage.tsx — email/password form built with
 * react-hook-form + zod (resolver validates client-side before any submit
 * handler network call) and shadcn's Nova Field/Controller pattern.
 */
export class LoginPage {
	readonly page: Page;
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;
	/** Field-level validation error for the email input. */
	readonly emailError: Locator;
	/** Field-level validation error for the password input. */
	readonly passwordError: Locator;
	/** Server-side auth error (react-hook-form's `errors.root`, e.g. bad credentials). */
	readonly authError: Locator;

	constructor(page: Page) {
		this.page = page;
		this.emailInput = page.getByLabel('Email');
		this.passwordInput = page.getByLabel('Password');
		// Matched by role alone, not name: it's the only button on the page, and
		// its accessible name switches to "Signing in…" while the request is in
		// flight, which would make a name-scoped locator stop matching.
		this.submitButton = page.getByRole('button');

		// Each Controller-rendered field wraps its own FieldError (role="alert")
		// inside a `[data-slot="field"]` div, so scope by which field's input the
		// wrapper "has" to tell the email and password errors apart.
		this.emailError = page
			.locator('[data-slot="field"]')
			.filter({ has: this.emailInput })
			.getByRole('alert');
		this.passwordError = page
			.locator('[data-slot="field"]')
			.filter({ has: this.passwordInput })
			.getByRole('alert');

		// The root/auth error renders as a bare FieldError directly inside the
		// FieldGroup (not wrapped in a per-field container), so it's the only
		// role="alert" that is a direct child of `[data-slot="field-group"]`.
		this.authError = page.locator('[data-slot="field-group"] > [role="alert"]');
	}

	async goto() {
		await this.page.goto('/login');
	}

	/** Fills both fields and submits, the way a real user would. */
	async login(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.submitButton.click();
	}
}
