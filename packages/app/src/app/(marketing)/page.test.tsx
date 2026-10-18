import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RULES } from '@mentorhub/core';
import HomePage from './page';

afterEach(cleanup);

describe('landing page', () => {
  it('renders the hero, the call to action and the three steps with values from RULES', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Grow faster with a mentor who has done it before',
    );
    expect(screen.getByRole('link', { name: 'Find a mentor' }).getAttribute('href')).toBe('#how');
    expect(screen.getByText(new RegExp(`${RULES.introMinutes}-minute intro`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`up to ${RULES.freeCancelHours} h before`))).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Find your mentor',
      'Book an intro',
      'Keep growing',
    ]);
  });
});
