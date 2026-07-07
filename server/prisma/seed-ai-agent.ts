import { Role } from '@prisma/client';
import { auth } from '../src/lib/auth.ts';
import { AI_AGENT_EMAIL } from '../src/lib/ai-agent.ts';

// Seeds the system "AI" agent — a real `agent`-role `User` row with no
// linked credential account (it never signs in; see
// `server/src/lib/ai-agent.ts`), used purely as the `Ticket.assignedToId`
// marker while the auto-resolve pg-boss job
// (`server/src/lib/auto-resolve-ticket.ts`) is handling a ticket. Run once
// via `bun run seed:ai-agent`, alongside `bun run seed` (the real admin
// user).
async function main() {
	const ctx = await auth.$context;

	const existing = await ctx.internalAdapter.findUserByEmail(AI_AGENT_EMAIL);
	if (existing) {
		console.log(`AI agent user ${AI_AGENT_EMAIL} already exists, skipping.`);
		return;
	}

	await ctx.internalAdapter.createUser({
		email: AI_AGENT_EMAIL,
		name: 'AI',
		emailVerified: true,
		role: Role.agent,
	});

	console.log(`Created AI agent user ${AI_AGENT_EMAIL}`);
}

main()
	.then(() => process.exit(0))
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
