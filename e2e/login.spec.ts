import AxeBuilder from '@axe-core/playwright';
import { ADMIN_CREDENTIALS, expect, test } from './fixtures';
import { login, loginAsAdmin, loginAsAgent } from './helpers';

test.describe('Login form client-side validation', () => {
	test('shows errors for both fields and makes no network call when submitting empty', async ({
		loginPage,
	}) => {
		await loginPage.goto();

		let signInRequests = 0;
		loginPage.page.on('request', request => {
			if (request.url().includes('/api/auth/sign-in/email')) signInRequests++;
		});

		await loginPage.submitButton.click();

		// zod's resolver runs on submit before react-hook-form's handler fires,
		// so both fields should show their custom messages with no request sent.
		await expect(loginPage.emailError).toHaveText('Enter a valid email address');
		await expect(loginPage.passwordError).toHaveText('Password is required');
		await expect(loginPage.page).toHaveURL('/login');
		expect(signInRequests, 'client-side validation must block the request').toBe(0);
	});

	test('shows an error for a malformed email and makes no network call', async ({ loginPage }) => {
		await loginPage.goto();
		await loginPage.emailInput.fill('not-an-email');
		await loginPage.passwordInput.fill('some-password');

		let signInRequests = 0;
		loginPage.page.on('request', request => {
			if (request.url().includes('/api/auth/sign-in/email')) signInRequests++;
		});

		await loginPage.submitButton.click();

		await expect(loginPage.emailError).toHaveText('Enter a valid email address');
		await expect(loginPage.passwordError).not.toBeVisible();
		expect(signInRequests, 'client-side validation must block the request').toBe(0);
	});

	test('shows an error for an empty password with a valid email and makes no network call', async ({
		loginPage,
	}) => {
		await loginPage.goto();
		await loginPage.emailInput.fill(ADMIN_CREDENTIALS.email);

		let signInRequests = 0;
		loginPage.page.on('request', request => {
			if (request.url().includes('/api/auth/sign-in/email')) signInRequests++;
		});

		await loginPage.submitButton.click();

		await expect(loginPage.passwordError).toHaveText('Password is required');
		await expect(loginPage.emailError).not.toBeVisible();
		expect(signInRequests, 'client-side validation must block the request').toBe(0);
	});
});

test.describe('Login flow', () => {
	test('shows an auth error and stays on /login for an unknown email', async ({ loginPage }) => {
		await login(loginPage, 'nobody@example.com', 'whatever123');

		// better-auth returns the same INVALID_EMAIL_OR_PASSWORD error for an
		// unknown email and a wrong password, to avoid leaking which one was wrong.
		await expect(loginPage.authError).toHaveText('Invalid email or password');
		await expect(loginPage.page).toHaveURL('/login');
	});

	test('shows an auth error and stays on /login for a wrong password', async ({ loginPage }) => {
		await login(loginPage, ADMIN_CREDENTIALS.email, 'definitely-the-wrong-password');

		await expect(loginPage.authError).toHaveText('Invalid email or password');
		await expect(loginPage.page).toHaveURL('/login');
	});

	test('logs in as admin, redirects to /, and shows the Users nav link', async ({
		loginPage,
		homePage,
	}) => {
		await loginAsAdmin(loginPage);

		await expect(homePage.welcomeMessage).toBeVisible();
		await expect(homePage.navBar.usersLink).toBeVisible();
	});

	test('logs in as agent, redirects to /, and hides the Users nav link', async ({
		loginPage,
		homePage,
	}) => {
		await loginAsAgent(loginPage);

		await expect(homePage.welcomeMessage).toBeVisible();
		await expect(homePage.navBar.usersLink).not.toBeVisible();
	});

	test('submits via the Enter key, not just a button click', async ({ loginPage, homePage }) => {
		await loginPage.goto();
		await loginPage.emailInput.fill(ADMIN_CREDENTIALS.email);
		await loginPage.passwordInput.fill(ADMIN_CREDENTIALS.password);
		await loginPage.passwordInput.press('Enter');

		await expect(homePage.page).toHaveURL('/');
	});

	test('disables the submit button and shows a loading label while the request is in flight', async ({
		loginPage,
	}) => {
		await loginPage.goto();

		// Hold the response open so the pending UI state is observable instead of
		// racing a fast local response.
		await loginPage.page.route('**/api/auth/sign-in/email', async route => {
			await new Promise(resolve => setTimeout(resolve, 500));
			await route.continue();
		});

		await loginPage.emailInput.fill(ADMIN_CREDENTIALS.email);
		await loginPage.passwordInput.fill(ADMIN_CREDENTIALS.password);
		await loginPage.submitButton.click();

		await expect(loginPage.submitButton).toBeDisabled();
		await expect(loginPage.submitButton).toHaveText('Signing in…');
	});

	test('does not render a self-serve sign-up link', async ({ loginPage }) => {
		// Confirmed by reading the source (no /signup or /register route in
		// App.tsx, no sign-up UI in LoginPage.tsx, and server/src/lib/auth.ts
		// sets emailAndPassword.disableSignUp: true) — this just guards against
		// a sign-up link being added to the login screen without matching
		// backend support, rather than testing a page that doesn't exist.
		await loginPage.goto();
		await expect(
			loginPage.page.getByRole('link', { name: /sign up|register|create an account/i }),
		).toHaveCount(0);
	});

	test('rejects sign-up at the API level, not just by hiding the UI', async ({ request }) => {
		// Confirmed against better-auth's own source (sign-up.ts): disableSignUp
		// makes this endpoint throw a 400 with this exact error code, regardless
		// of what the client UI exposes.
		const response = await request.post('/api/auth/sign-up/email', {
			data: {
				name: 'Intruder',
				email: `intruder-${Date.now()}@example.com`,
				password: 'whatever123',
			},
		});

		expect(response.status()).toBe(400);
		expect((await response.json()).code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED');
	});
});

test.describe('Login page accessibility', () => {
	test('has no automatically detectable accessibility violations', async ({ loginPage }) => {
		await loginPage.goto();

		const results = await new AxeBuilder({ page: loginPage.page }).analyze();

		expect(results.violations).toEqual([]);
	});
});
