'use client';

import { Check } from '@phosphor-icons/react';

/**
 * Hard, visible password rules for the Create-account form.
 *
 * Replaced an earlier zxcvbn-based strength meter because zxcvbn's
 * feedback ("add another word", "uncommon words are better") didn't
 * tell the user the *concrete* requirements. Users need a checklist
 * they can tick off, not entropy estimation.
 *
 * Rule set is the standard enterprise-SaaS bar (Salesforce / Workday /
 * ServiceNow): 12 chars, mixed case, digit, symbol. NIST 800-63B
 * technically prefers length-only with breach checks, but real-world
 * users expect — and feel safer with — explicit complexity rules.
 */

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$% …)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** True when every rule passes — used by the form's submit guard. */
export function passwordMeetsRequirements(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

/** First failing rule's label, or '' when all pass — used for inline error copy. */
export function firstFailingRule(password: string): string {
  const failing = PASSWORD_RULES.find((r) => !r.test(password));
  return failing ? failing.label : '';
}

/**
 * Live checklist rendered above the password input. Each row turns
 * green + check when its rule passes. Empty-state rows use a hollow
 * ring so the user can scan what's still missing at a glance.
 */
export default function PasswordRequirements({ password }: { password: string }) {
  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-[var(--surface-bg)] border border-[var(--border-subtle)]"
      role="list"
      aria-label="Password requirements"
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-0.5">
        Your password must include
      </div>
      {PASSWORD_RULES.map((req, i) => {
        const passed = !!password && req.test(password);
        return (
          <div
            key={i}
            role="listitem"
            className="flex items-center gap-2 text-[11px]"
          >
            {passed ? (
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--success)] flex items-center justify-center flex-shrink-0">
                <Check size={9} weight="bold" className="text-white" />
              </span>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[var(--text-tertiary)] flex-shrink-0" />
            )}
            <span
              className={
                passed
                  ? 'text-[var(--success)] font-semibold line-through opacity-70'
                  : 'text-[var(--text-secondary)]'
              }
            >
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
