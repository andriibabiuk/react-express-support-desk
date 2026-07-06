import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Without `test.globals` in vitest.config.ts, @testing-library/react's own
// implicit auto-cleanup (which hooks the global `afterEach`) never registers,
// so each test's render() output would otherwise accumulate in document.body
// across the whole file instead of being unmounted between tests.
afterEach(() => {
	cleanup();
});
