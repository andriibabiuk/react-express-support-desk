import { createAuthClient } from 'better-auth/react';
import type { Role } from 'core';

interface AppSession {
	user: { name: string; email: string; role: Role };
}

export const authClient = createAuthClient();

export function useAuth() {
	return authClient.useSession() as {
		data: AppSession | null;
		isPending: boolean;
	};
}
