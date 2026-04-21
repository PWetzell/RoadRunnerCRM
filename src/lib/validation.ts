/**
 * Shared form validation utilities.
 *
 * Uses a simple rule-based approach: each field has an array of rules,
 * each rule is a function that returns an error string or null.
 *
 * Usage:
 *   const errors = validate({
 *     name: [required('Name'), minLength('Name', 2)],
 *     email: [required('Email'), isEmail()],
 *     amount: [required('Amount'), isPositiveNumber()],
 *   }, { name: '', email: 'bad', amount: '-5' });
 *   // => { name: 'Name is required', email: 'Invalid email address', amount: 'Must be a positive number' }
 */

export type ValidationRule = (value: string) => string | null;

export interface ValidationErrors {
  [field: string]: string | undefined;
}

/** Run all rules for all fields. Returns only fields that have errors. */
export function validate(
  rules: Record<string, ValidationRule[]>,
  values: Record<string, string | number | undefined | null>,
): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    const val = String(values[field] ?? '');
    for (const rule of fieldRules) {
      const err = rule(val);
      if (err) {
        errors[field] = err;
        break; // Stop at first error per field
      }
    }
  }
  return errors;
}

/** Returns true if there are no errors. */
export function isValid(errors: ValidationErrors): boolean {
  return Object.values(errors).every((e) => !e);
}

/** Returns true if a specific field has an error. */
export function hasError(errors: ValidationErrors, field: string): boolean {
  return !!errors[field];
}

// ─── Built-in rules ──────────────────────────────────────────────────────────

/** Field must not be empty or whitespace-only. */
export function required(label: string): ValidationRule {
  return (val) => (!val.trim() ? `${label} is required` : null);
}

/** Minimum length (after trimming). */
export function minLength(label: string, min: number): ValidationRule {
  return (val) => (val.trim().length > 0 && val.trim().length < min ? `${label} must be at least ${min} characters` : null);
}

/** Maximum length. */
export function maxLength(label: string, max: number): ValidationRule {
  return (val) => (val.length > max ? `${label} must be at most ${max} characters` : null);
}

/** Must be a valid email format. */
export function isEmail(): ValidationRule {
  return (val) => {
    if (!val.trim()) return null; // Use required() separately if you want non-empty
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? null : 'Invalid email address';
  };
}

/** Must be a valid phone number (loose — allows +, parens, dashes, spaces, dots). */
export function isPhone(): ValidationRule {
  return (val) => {
    if (!val.trim()) return null;
    return /^[+]?[\d\s()./-]{7,20}$/.test(val.replace(/\s+/g, '')) ? null : 'Invalid phone number';
  };
}

/** Must be a positive number. */
export function isPositiveNumber(): ValidationRule {
  return (val) => {
    if (!val.trim()) return null;
    const n = Number(val);
    return !isNaN(n) && n > 0 ? null : 'Must be a positive number';
  };
}

/** Must be a non-negative number (zero allowed). */
export function isNonNegativeNumber(): ValidationRule {
  return (val) => {
    if (!val.trim()) return null;
    const n = Number(val);
    return !isNaN(n) && n >= 0 ? null : 'Must be a number (0 or greater)';
  };
}

/** Must be a valid URL (loose check). */
export function isUrl(): ValidationRule {
  return (val) => {
    if (!val.trim()) return null;
    try {
      new URL(val.startsWith('http') ? val : `https://${val}`);
      return null;
    } catch {
      return 'Invalid URL';
    }
  };
}

/** Must be a valid date string (YYYY-MM-DD or similar). */
export function isDate(): ValidationRule {
  return (val) => {
    if (!val.trim()) return null;
    return !isNaN(new Date(val).getTime()) ? null : 'Invalid date';
  };
}

/** Must match one of the given options. */
export function oneOf(label: string, options: string[]): ValidationRule {
  return (val) => {
    if (!val.trim()) return null;
    return options.includes(val) ? null : `${label} must be one of: ${options.join(', ')}`;
  };
}
