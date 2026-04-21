'use client';

import { ReactNode } from 'react';

export function FormField({ label, value, onChange, placeholder, type = 'text', autoFocus, required, hint, error, children }: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
        {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {children ? (
        children
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full h-9 px-3 text-[13px] bg-[var(--surface-raised)] border rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-primary)] ${
            error ? 'border-[var(--danger)]' : 'border-[var(--border)]'
          }`}
        />
      )}
      {hint && !error && <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{hint}</p>}
      {error && <p className="text-[10px] text-[var(--danger)] mt-1">{error}</p>}
    </div>
  );
}
