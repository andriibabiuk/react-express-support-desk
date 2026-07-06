import { Role } from '@prisma/client';
import { auth } from '../src/lib/auth.ts';

// Seeds a second, agent-role user for e2e role-gating coverage
// (AdminRoute redirect, NavBar "Users" link visibility, etc). Kept separate
// from prisma/seed.ts, which intentionally seeds only the one admin user for
// real dev/prod provisioning (see CLAUDE.md) — this script is wired into
// e2e/reset-test-db.ts and only ever runs against the supportdesk_test DB.
async function main() {
	const email = process.env.SEED_AGENT_EMAIL;
	const password = process.env.SEED_AGENT_PASSWORD;

	if (!email || !password) {
		throw new Error('SEED_AGENT_EMAIL and SEED_AGENT_PASSWORD must be set');
	}

	const ctx = await auth.$context;

	const existing = await ctx.internalAdapter.findUserByEmail(email);
	if (existing) {
		console.log(`Agent user ${email} already exists, skipping.`);
		return;
	}

	const user = await ctx.internalAdapter.createUser({
		email,
		name: 'Agent',
		emailVerified: true,
		role: Role.agent,
	});

	const hashedPassword = await ctx.password.hash(password);
	await ctx.internalAdapter.linkAccount({
		accountId: user.id,
		providerId: 'credential',
		password: hashedPassword,
		userId: user.id,
	});

	console.log(`Created agent user ${email}`);
}

main()
	.then(() => process.exit(0))
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
