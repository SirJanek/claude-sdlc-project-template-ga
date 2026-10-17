'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ZodType } from 'zod';
import { Button } from '../../components/ui/button';
import type { ApiResult, FieldErrors } from '../api/types';
import { isCancelShortcut, isSubmitShortcut, validateWithSchema } from './form-state';

export interface CrudField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface CrudFormProps<T> {
  /** The same Zod schema the API route uses — one schema, two call sites. */
  schema: ZodType<T>;
  fields: CrudField[];
  initialValues?: Record<string, string>;
  submitLabel?: string;
  onSubmit: (values: T) => Promise<ApiResult<unknown>>;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

/** Schema-driven create/edit form: client validation, server field errors, Cmd/Ctrl+Enter, Escape. */
export function CrudForm<T>({
  schema,
  fields,
  initialValues = {},
  submitLabel = 'Save',
  onSubmit,
  onCancel,
  onSuccess,
}: CrudFormProps<T>) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) return;
    const validation = validateWithSchema(schema, values);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    const result = await onSubmit(validation.data);
    setIsSubmitting(false);
    if (result.ok) {
      setFieldErrors({});
      onSuccess?.();
      return;
    }
    setFieldErrors(result.error.fieldErrors ?? {});
    setFormError(result.error.message);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (isSubmitShortcut(event)) {
      event.preventDefault();
      void submit();
    } else if (isCancelShortcut(event) && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="grid gap-4">
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {fields.map((field) => {
        const errors = fieldErrors[field.name];
        const id = `crud-${field.name}`;
        const common = {
          id,
          name: field.name,
          value: values[field.name] ?? '',
          placeholder: field.placeholder,
          'aria-invalid': errors ? true : undefined,
          className: inputClass,
        };
        const onChange = (value: string) => setValues((current) => ({ ...current, [field.name]: value }));
        return (
          <label key={field.name} htmlFor={id} className="grid gap-1.5 text-sm">
            <span className="font-medium">{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea {...common} rows={4} onChange={(e) => onChange(e.target.value)} />
            ) : field.type === 'select' ? (
              <select {...common} onChange={(e) => onChange(e.target.value)}>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input {...common} type={field.type ?? 'text'} onChange={(e) => onChange(e.target.value)} />
            )}
            {errors ? <span className="text-xs text-destructive">{errors.join(' ')}</span> : null}
          </label>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
