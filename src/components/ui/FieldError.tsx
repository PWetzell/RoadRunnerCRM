'use client';

import { Warning } from '@phosphor-icons/react';

/**
 * Inline field validation error. Renders below an input with a warning
 * icon + red text. Accepts a string error message — renders nothing if
 * the message is falsy.
 */
export default function FieldError({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)] animate-[fadeUp_0.15s_ease-out]">
      <Warning size={12} weight="fill" className="flex-shrink-0" />
      {error}
    </div>
  );
}

/**
 * Wraps an input/select/textarea and adds an error border + message
 * when validation fails. Use as:
 *
 *   <ValidatedField error={errors.name}>
 *     <input value={name} onChange={...} />
 *   </ValidatedField>
 */
export function ValidatedField({ error, children }: { error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <div className={error ? '[&>input]:border-[var(--danger)] [&>input]:shadow-[0_0_0_3px_var(--danger-bg)] [&>textarea]:border-[var(--danger)] [&>textarea]:shadow-[0_0_0_3px_var(--danger-bg)] [&>select]:border-[var(--danger)] [&>select]:shadow-[0_0_0_3px_var(--danger-bg)]' : ''}>
        {children}
      </div>
      <FieldError error={error} />
    </div>
  );
}
