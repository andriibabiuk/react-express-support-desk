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
