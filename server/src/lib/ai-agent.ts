import { prisma } from './prisma.ts';

// Seeded once via `bun run seed:ai-agent` (see `prisma/seed-ai-agent.ts`) —
// a real `agent`-role `User` row with no linked credential account (it never
// signs in), used purely as the `Ticket.assignedToId` marker while a ticket
// is being handled by the auto-resolve pg-boss job
// (`server/src/lib/auto-resolve-ticket.ts`).
export const AI_AGENT_EMAIL = 'ai@supportdesk.internal';

let cachedAiAgentId: string | null | undefined;

// Returns `null` (logging once) rather than throwing when the AI agent
// hasn't been seeded yet, so a missing `bun run seed:ai-agent` degrades to
// "tickets just don't get auto-assigned" instead of failing every inbound
// email.
export async function getAiAgentId(): Promise<string | null> {
	if (cachedAiAgentId !== undefined) return cachedAiAgentId;

	const aiAgent = await prisma.user.findUnique({
		where: { email: AI_AGENT_EMAIL },
		select: { id: true },
	});
	if (!aiAgent) {
		console.error(
			`AI agent user (${AI_AGENT_EMAIL}) not found — run \`bun run seed:ai-agent\`. Tickets won't be auto-assigned to it.`,
		);
	}
	cachedAiAgentId = aiAgent?.id ?? null;
	return cachedAiAgentId;
}
