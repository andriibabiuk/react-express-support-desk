import { readFileSync } from 'node:fs';

// Read once at startup rather than on every job run — the file only changes
// via a deploy, not at runtime.
const knowledgeBasePath = new URL('../../knowledge-base.md', import.meta.url);
export const knowledgeBase = readFileSync(knowledgeBasePath, 'utf-8');
