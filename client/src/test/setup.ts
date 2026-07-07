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

// jsdom doesn't implement the Pointer Events / scroll APIs Radix's Select
// (and other popover-based primitives) rely on to open and position its
// content — without these no-op stubs, opening a `Select` in a test throws
// (`hasPointerCapture is not a function`) instead of just skipping the visual
// positioning logic that jsdom can't do anyway.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => {};
window.HTMLElement.prototype.releasePointerCapture = () => {};
