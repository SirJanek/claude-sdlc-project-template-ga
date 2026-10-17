import type { ZodType } from 'zod';
import type { FieldErrors } from '../api/types';

/** Validates values with the shared Zod schema; returns parsed data or field errors keyed by field. */
export function validateWithSchema<T>(
  schema: ZodType<T>,
  values: unknown,
): { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, fieldErrors };
}

/** Cmd/Ctrl+Enter submits a form (standard across every CrudForm). */
export function isSubmitShortcut(event: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey);
}

/** Escape cancels a form. */
export function isCancelShortcut(event: { key: string }): boolean {
  return event.key === 'Escape';
}
