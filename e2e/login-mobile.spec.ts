import { devices } from '@playwright/test';
import { expect, test } from './fixtures';
import { loginAsAdmin } from './helpers';

// `devices['iPhone 13']` sets `defaultBrowserType` (webkit) along with the
// viewport/UA/touch emulation, and Playwright only allows worker-scoped
// options like that to be set at the top level of a file (or in
// playwright.config.ts) — not inside a test.describe block, since changing
// them mid-file would force a new worker. Hence this lives in its own file
// rather than a describe block inside login.spec.ts.
test.use({ ...devices['iPhone 13'] });

test('logs in as admin on a mobile viewport', async ({ loginPage, homePage }) => {
	await loginAsAdmin(loginPage);

	await expect(homePage.welcomeMessage).toBeVisible();
	await expect(homePage.navBar.usersLink).toBeVisible();
});
