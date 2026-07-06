import { Role } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.ts';

export const auth = betterAuth({
	basePath: '/api/auth',
	trustedOrigins: [process.env.CLIENT_URL!],
	database: prismaAdapter(prisma, {
		provider: 'postgresql',
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
	},
	user: {
		additionalFields: {
			role: {
				type: [Role.admin, Role.agent],
				input: false,
				required: true,
				defaultValue: Role.agent,
			},
			deletedAt: {
				type: 'date',
				input: false,
				required: false,
			},
		},
	},
});
