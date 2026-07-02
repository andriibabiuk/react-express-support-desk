import { createAuthClient } from 'better-auth/react';

interface AppSession {
	user: { name: string; email: string; role: 'admin' | 'agent' };
}

export const authClient = createAuthClient();

export function useAuth() {
	return authClient.useSession() as {
		data: AppSession | null;
		isPending: boolean;
	};
}
