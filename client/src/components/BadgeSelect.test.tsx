import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BadgeSelect, type BadgeSelectOption } from './BadgeSelect';

const OPTIONS: BadgeSelectOption<'a' | 'b'>[] = [
	{ value: 'a', label: 'Option A', badgeVariant: 'secondary' },
	{ value: 'b', label: 'Option B', badgeVariant: 'destructive' },
];

describe('BadgeSelect', () => {
	it("renders the currently selected option's label", () => {
		render(<BadgeSelect value='a' options={OPTIONS} onValueChange={vi.fn()} />);

		expect(screen.getByText('Option A')).toBeInTheDocument();
		expect(screen.queryByText('Option B')).not.toBeInTheDocument();
	});

	it('falls back to an outline badge when the value matches no option', () => {
		render(
			<BadgeSelect
				value={'missing' as 'a' | 'b'}
				options={OPTIONS}
				onValueChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});

	it('lists every option and calls onValueChange with the selected value', () => {
		const onValueChange = vi.fn();
		render(<BadgeSelect value='a' options={OPTIONS} onValueChange={onValueChange} />);

		fireEvent.click(screen.getByRole('combobox'));
		expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
		expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();

		fireEvent.click(screen.getByRole('option', { name: 'Option B' }));

		expect(onValueChange).toHaveBeenCalledWith('b');
	});
});
