import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Renders `ui` inside a fresh, retry-disabled QueryClientProvider — for
 * components that call @tanstack/react-query's useQuery/useMutation. A fresh
 * QueryClient per call avoids cross-test cache bleed, and disabling retries
 * means a rejected mock reaches the error state immediately instead of
 * waiting through React Query's retry backoff.
 */
export function renderWithQuery(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
