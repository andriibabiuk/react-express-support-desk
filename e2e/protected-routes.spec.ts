import { expect, test } from './fixtures';
import { loginAsAdmin, loginAsAgent } from './helpers';

test.describe('Unauthenticated access', () => {
	test('redirects from the home route to /login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});

	test('redirects from /users to /login', async ({ page }) => {
		await page.goto('/users');
		await expect(page).toHaveURL('/login');
	});

	test('shows the login form itself rather than redirecting elsewhere', async ({
		loginPage,
	}) => {
		await loginPage.goto();
		await expect(loginPage.page).toHaveURL('/login');
		await expect(loginPage.submitButton).toBeVisible();
	});
});

test.describe('AdminRoute role gating on /users', () => {
	test('admin can reach /users', async ({ loginPage, usersPage }) => {
		await test.step('log in as admin', () => loginAsAdmin(loginPage));

		await usersPage.goto();

		await expect(usersPage.page).toHaveURL('/users');
		await expect(usersPage.heading).toBeVisible();
	});

	test('agent is redirected away from /users to /', async ({ loginPage, usersPage }) => {
		await test.step('log in as agent', () => loginAsAgent(loginPage));

		await usersPage.goto();

		await expect(usersPage.page).toHaveURL('/');
	});
});

test.describe('Session behavior', () => {
	test('persists across a page reload', async ({ loginPage, homePage }) => {
		await loginAsAdmin(loginPage);

		await homePage.page.reload();

		// A stale/lost session would bounce back to /login here instead.
		await expect(homePage.page).toHaveURL('/');
		await expect(homePage.welcomeMessage).toBeVisible();
	});

	test('redirects an already-authenticated user away from /login to /', async ({
		loginPage,
		homePage,
	}) => {
		await loginAsAdmin(loginPage);

		// LoginPage's own useEffect bounces an authenticated visitor straight
		// back to "/" rather than showing the form again.
		await loginPage.goto();

		await expect(homePage.page).toHaveURL('/');
	});

	test('signing out returns to /login and actually clears the session', async ({
		loginPage,
		homePage,
		usersPage,
	}) => {
		await loginAsAdmin(loginPage);

		await homePage.navBar.signOut();

		await expect(homePage.page).toHaveURL('/login');

		// If sign-out only cleared client-side state without invalidating the
		// session server-side, revisiting a protected route would still succeed
		// instead of bouncing back to /login. Check both the plain protected
		// route and the admin-only one, since they're gated by separate guards
		// (ProtectedRoute vs. AdminRoute) that could independently regress.
		await homePage.goto();
		await expect(homePage.page).toHaveURL('/login');

		await usersPage.goto();
		await expect(usersPage.page).toHaveURL('/login');
	});
});
