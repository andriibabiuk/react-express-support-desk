import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '../server');

dotenv.config({ path: path.join(serverDir, '.env.test') });

execSync('bunx prisma migrate reset --force', {
	cwd: serverDir,
	env: process.env,
	stdio: 'inherit',
});

execSync('bun run prisma/seed.ts', {
	cwd: serverDir,
	env: process.env,
	stdio: 'inherit',
});

// e2e-only: also seed an agent-role user (not part of the app's normal
// dev/prod seed) so role-gating tests (AdminRoute, NavBar "Users" link) have
// a non-admin account to log in as.
execSync('bun run prisma/seed-e2e-agent.ts', {
	cwd: serverDir,
	env: process.env,
	stdio: 'inherit',
});

// Required for `emails.spec.ts`'s auto-resolve coverage — inbound tickets
// are auto-assigned to this user on creation (see `server/src/lib/ai-agent.ts`).
execSync('bun run prisma/seed-ai-agent.ts', {
	cwd: serverDir,
	env: process.env,
	stdio: 'inherit',
});
