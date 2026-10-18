import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isCancelShortcut, isSubmitShortcut, validateWithSchema } from './form-state';

const schema = z.object({ email: z.string().email('Enter a valid email.'), name: z.string().min(2, 'Too short.') });

describe('validateWithSchema', () => {
  it('returns parsed data and strips unknown fields', () => {
    expect(validateWithSchema(schema, { email: 'a@b.io', name: 'Ann', role: 'admin' })).toEqual({
      ok: true,
      data: { email: 'a@b.io', name: 'Ann' },
    });
  });

  it('collects messages per field', () => {
    expect(validateWithSchema(schema, { email: 'x', name: 'A' })).toEqual({
      ok: false,
      fieldErrors: { email: ['Enter a valid email.'], name: ['Too short.'] },
    });
  });
});

describe('keyboard shortcuts', () => {
  it('submits on Cmd/Ctrl+Enter only and cancels on Escape', () => {
    expect(isSubmitShortcut({ key: 'Enter', metaKey: true, ctrlKey: false })).toBe(true);
    expect(isSubmitShortcut({ key: 'Enter', metaKey: false, ctrlKey: true })).toBe(true);
    expect(isSubmitShortcut({ key: 'Enter', metaKey: false, ctrlKey: false })).toBe(false);
    expect(isCancelShortcut({ key: 'Escape' })).toBe(true);
  });
});

describe('validateWithSchema — form-level errors', () => {
  it('keys errors without a path as _form', () => {
    expect(validateWithSchema(z.string().min(3, 'Too short.'), 'ab')).toEqual({
      ok: false,
      fieldErrors: { _form: ['Too short.'] },
    });
  });
});
