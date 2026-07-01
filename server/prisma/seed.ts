import { Role } from '@prisma/client';
import { auth } from '../src/lib/auth.ts';

async function main() {
	const email = process.env.SEED_ADMIN_EMAIL;
	const password = process.env.SEED_ADMIN_PASSWORD;

	if (!email || !password) {
		throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
	}

	const ctx = await auth.$context;

	const existing = await ctx.internalAdapter.findUserByEmail(email);
	if (existing) {
		console.log(`Admin user ${email} already exists, skipping.`);
		return;
	}

	const user = await ctx.internalAdapter.createUser({
		email,
		name: 'Admin',
		emailVerified: true,
		role: Role.admin,
	});

	const hashedPassword = await ctx.password.hash(password);
	await ctx.internalAdapter.linkAccount({
		accountId: user.id,
		providerId: 'credential',
		password: hashedPassword,
		userId: user.id,
	});

	console.log(`Created admin user ${email}`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
