import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithQuery } from '../test/utils';
import { BackLink } from './BackLink';

describe('BackLink', () => {
	it('renders the label and links to the given path', () => {
		renderWithQuery(<BackLink to='/tickets' label='Back to tickets' />);

		const link = screen.getByRole('link', { name: 'Back to tickets' });
		expect(link).toHaveAttribute('href', '/tickets');
	});
});
