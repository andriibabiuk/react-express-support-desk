import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Renders `ui` inside a fresh, retry-disabled QueryClientProvider and a
 * MemoryRouter — for components that call @tanstack/react-query's
 * useQuery/useMutation and/or render react-router-dom's `Link`/`NavLink`. A
 * fresh QueryClient per call avoids cross-test cache bleed, and disabling
 * retries means a rejected mock reaches the error state immediately instead
 * of waiting through React Query's retry backoff.
 */
export function renderWithQuery(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{ui}</MemoryRouter>
		</QueryClientProvider>,
	);
}
