import { test as base } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';

// playwright.config.ts loads server/.env.test into process.env before
// Playwright spawns test workers, so these are the same credentials
// server/prisma/seed.ts (admin) and server/prisma/seed-e2e-agent.ts (agent)
// provision in the supportdesk_test DB via `bun run test:e2e`. Falling back
// to the documented .env.test.example defaults keeps tests runnable even if
// a worker process doesn't inherit the parent's env for some reason.
export const ADMIN_CREDENTIALS = {
	email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
	password: process.env.SEED_ADMIN_PASSWORD ?? 'password123',
};

export const AGENT_CREDENTIALS = {
	email: process.env.SEED_AGENT_EMAIL ?? 'agent@example.com',
	password: process.env.SEED_AGENT_PASSWORD ?? 'password123',
};

type Fixtures = {
	loginPage: LoginPage;
	homePage: HomePage;
	usersPage: UsersPage;
};

export const test = base.extend<Fixtures>({
	loginPage: async ({ page }, use) => {
		await use(new LoginPage(page));
	},
	homePage: async ({ page }, use) => {
		await use(new HomePage(page));
	},
	usersPage: async ({ page }, use) => {
		await use(new UsersPage(page));
	},
});

export { expect } from '@playwright/test';
