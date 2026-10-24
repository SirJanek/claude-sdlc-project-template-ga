import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Input } from '../../components/ui/input';
import { FormField } from './FormField';

afterEach(cleanup);

describe('FormField', () => {
  it('links label, hint and error to the control and marks it invalid', () => {
    render(
      <FormField
        label="Price for 50 minutes"
        hint="In USD, between 20 and 300."
        error="Enter a price between 20 and 300 USD."
        necessity="required"
      >
        <Input inputMode="numeric" />
      </FormField>,
    );
    const input = screen.getByRole('textbox', { name: /Price for 50 minutes/ });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect((input as HTMLInputElement).required).toBe(true);
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      'Enter a price between 20 and 300 USD.',
      'In USD, between 20 and 300.',
    ]);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('keeps the control id and own description, marks optional and stays valid without an error', () => {
    render(
      <>
        <p id="own">Shown on your profile.</p>
        <FormField label="Headline" necessity="optional">
          <Input id="headline" aria-describedby="own" />
        </FormField>
        <FormField label="Name">
          <Input aria-invalid="false" required />
        </FormField>
      </>,
    );
    const headline = screen.getByRole('textbox', { name: /Headline/ });
    expect(headline.id).toBe('headline');
    expect(headline.getAttribute('aria-describedby')).toBe('own');
    expect(headline.hasAttribute('aria-invalid')).toBe(false);
    expect(screen.getByText('Optional')).toBeTruthy();
    const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    expect(name.getAttribute('aria-invalid')).toBe('false');
    expect(name.required).toBe(true);
    expect(name.hasAttribute('aria-describedby')).toBe(false);
  });
});
