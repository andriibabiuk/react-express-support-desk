import { TicketsTable } from '@/components/TicketsTable';

export function TicketsPage() {
	return (
		<main className='flex-1 p-6'>
			<h1 className='text-2xl font-heading font-medium'>Tickets</h1>
			<TicketsTable />
		</main>
	);
}
