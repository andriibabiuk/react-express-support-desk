import { expect } from '@playwright/test';
import { ADMIN_CREDENTIALS, AGENT_CREDENTIALS } from './fixtures';
import type { LoginPage } from './pages/LoginPage';

/** Navigates to /login and submits the form. Does not assert the outcome. */
export async function login(loginPage: LoginPage, email: string, password: string) {
	await loginPage.goto();
	await loginPage.login(email, password);
}

/** Logs in as the seeded admin user and waits for the post-login redirect to "/". */
export async function loginAsAdmin(loginPage: LoginPage) {
	await login(loginPage, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
	await expect(loginPage.page).toHaveURL('/');
}

/** Logs in as the seeded agent user and waits for the post-login redirect to "/". */
export async function loginAsAgent(loginPage: LoginPage) {
	await login(loginPage, AGENT_CREDENTIALS.email, AGENT_CREDENTIALS.password);
	await expect(loginPage.page).toHaveURL('/');
}
