import { z } from 'zod';

const name = z.string().trim().min(3, 'Name must be at least 3 characters');
const email = z.email('Enter a valid email address');

export const createUserSchema = z.object({
	name,
	email,
	password: z.string().trim().min(8, 'Password must be at least 8 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
	name,
	email,
	// Blank means "don't change the password" — only enforce the minimum
	// length when a new password was actually provided.
	password: z
		.string()
		.trim()
		.refine(value => value.length === 0 || value.length >= 8, {
			message: 'Password must be at least 8 characters',
		}),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
