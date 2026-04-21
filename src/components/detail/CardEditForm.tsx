'use client';

import { useState } from 'react';
import { FloppyDisk, X, Trash, Warning } from '@phosphor-icons/react';
import { ValidationRule, validate, isValid, ValidationErrors } from '@/lib/validation';

export type CardFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface CardFieldConfig {
  key: string;
  label: string;
  type?: CardFieldType;
  /** Initial value — supports strings or numbers (normalized to string internally). */
  value?: string | number | null;
  placeholder?: string;
  /** Options for type=select */
  options?: string[];
  /** Full row width instead of 2-col; default auto (2-col). */
  full?: boolean;
  /** ISO date placeholder formatting etc. */
  help?: string;
  /** Whether this field is required. Adds a * indicator and a required rule. */
  required?: boolean;
  /** Validation rules. If `required` is true, a required rule is prepended automatically. */
  rules?: ValidationRule[];
}

/**
 * Lightweight inline form used inside a SectionCard when it's in edit mode.
 * Mirrors the Contacts pattern (label on top, input below, Cancel/Save in a
 * footer row) but is generic — the caller supplies a field config and a save
 * callback. Good for editing a flat set of fields on a Deal or an Organization.
 */
export default function CardEditForm({
  fields,
  onSave,
  onCancel,
  onDelete,
  saveLabel = 'Save',
}: {
  fields: CardFieldConfig[];
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  saveLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      init[f.key] = f.value == null ? '' : String(f.value);
    });
    return init;
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Build rules map from field configs
  const rulesMap: Record<string, ValidationRule[]> = {};
  fields.forEach((f) => {
    const fieldRules: ValidationRule[] = [];
    if (f.required) {
      fieldRules.push((val: string) => (!val.trim() ? `${f.label} is required` : null));
    }
    if (f.rules) fieldRules.push(...f.rules);
    if (fieldRules.length > 0) rulesMap[f.key] = fieldRules;
  });

  const handleChange = (key: string, val: string) => {
    setValues({ ...values, [key]: val });
    // Clear error on change if user has touched the field
    if (touched.has(key)) {
      const fieldErrors = validate({ [key]: rulesMap[key] || [] }, { [key]: val });
      setErrors((prev) => ({ ...prev, [key]: fieldErrors[key] }));
    }
  };

  const handleBlur = (key: string) => {
    setTouched((prev) => new Set(prev).add(key));
    if (rulesMap[key]) {
      const fieldErrors = validate({ [key]: rulesMap[key] }, { [key]: values[key] });
      setErrors((prev) => ({ ...prev, [key]: fieldErrors[key] }));
    }
  };

  const handleSave = () => {
    // Validate all fields
    const allErrors = validate(rulesMap, values);
    setErrors(allErrors);
    setTouched(new Set(fields.map((f) => f.key)));
    if (!isValid(allErrors)) return;
    onSave(values);
  };

  const inputBorder = (key: string) =>
    errors[key]
      ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]'
      : 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-bg)]';

  return (
    <div className="animate-[fieldSlideIn_0.25s_ease-out]">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {fields.map((f) => (
          <div key={f.key} className={f.full || f.type === 'textarea' ? 'col-span-2' : ''}>
            <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              {f.label}{f.required && <span className="text-[var(--danger)] ml-0.5">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onBlur={() => handleBlur(f.key)}
                placeholder={f.placeholder}
                rows={3}
                className={`w-full px-2.5 py-2 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none resize-y`}
              />
            ) : f.type === 'select' ? (
              <select
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onBlur={() => handleBlur(f.key)}
                className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
              >
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onBlur={() => handleBlur(f.key)}
                placeholder={f.placeholder}
                className={`w-full h-[34px] px-2.5 ${inputBorder(f.key)} rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-card)] outline-none`}
              />
            )}
            {errors[f.key] && (
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[var(--danger)] animate-[fadeUp_0.15s_ease-out]">
                <Warning size={12} weight="fill" className="flex-shrink-0" />
                {errors[f.key]}
              </div>
            )}
            {!errors[f.key] && f.help && (
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{f.help}</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-3 mt-3 border-t border-[var(--border-subtle)]">
        {onDelete ? (
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-xs font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer"
          >
            <Trash size={14} /> Remove
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[var(--brand-primary)] rounded-[var(--radius-sm)] border-none cursor-pointer"
          >
            <FloppyDisk size={14} /> {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
