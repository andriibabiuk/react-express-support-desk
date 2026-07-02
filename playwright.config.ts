import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Loads server/.env.test into process.env, which Playwright then forwards
// to both webServer child processes below (DATABASE_URL, BETTER_AUTH_*,
// PORT, VITE_PORT, VITE_API_PROXY_TARGET, ...), pointing the whole stack at
// the separate `supportdesk_test` database and dedicated e2e ports instead
// of whatever `bun run dev` normally uses. Run `bun run test:e2e:db:reset`
// (or `bun run test:e2e`, which does it automatically) before this config's
// webServer entries start, since Playwright starts webServers before
// globalSetup would run.
dotenv.config({ path: path.resolve(__dirname, 'server/.env.test') });

const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5174';
const serverPort = process.env.PORT ?? '4001';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	reporter: 'html',
	use: {
		baseURL: clientUrl,
		trace: 'on-first-retry',
	},
	webServer: [
		{
			command: 'bun run start',
			cwd: 'server',
			url: `http://localhost:${serverPort}/api/health`,
			reuseExistingServer: !process.env.CI,
			timeout: 60_000,
		},
		{
			command: 'bun run dev',
			cwd: 'client',
			url: clientUrl,
			reuseExistingServer: !process.env.CI,
			timeout: 60_000,
		},
	],
});
