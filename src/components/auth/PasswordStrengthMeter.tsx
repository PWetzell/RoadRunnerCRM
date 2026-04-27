'use client';

import { useMemo } from 'react';
import { CheckCircle, Warning, Info } from '@phosphor-icons/react';
import { evaluatePassword, MIN_ACCEPTABLE_SCORE, type PasswordEvaluation } from '@/lib/auth/password-strength';

/**
 * Real-time password strength meter shown beneath the password field on
 * the Create-account form.
 *
 * Visual structure (top → bottom):
 *   1. 5-segment bar (filled segments = score + 1)
 *   2. Score label ("Strong", "Fair", etc.) + min-acceptable hint
 *   3. zxcvbn warning text (if any) — e.g. "This is similar to a
 *      commonly used password"
 *   4. zxcvbn suggestions list (if any) — concrete fixes
 *
 * Mirrors the meter pattern used by Dropbox, GitHub, and 1Password.
 */
export default function PasswordStrengthMeter({
  password,
  userInputs,
}: {
  password: string;
  /**
   * Other fields from the signup form (name, email) — zxcvbn penalizes
   * passwords that contain or resemble these so users can't pick
   * "PaulWentzell123" and call it strong.
   */
  userInputs?: string[];
}) {
  const evalResult: PasswordEvaluation = useMemo(
    () => evaluatePassword(password, userInputs ?? []),
    [password, userInputs],
  );

  // Hide entirely when the field is empty — no "Too weak" shouting at
  // the user before they've typed anything.
  if (!password) return null;

  const { score, label, color, warning, suggestions } = evalResult;
  const meetsMin = score >= MIN_ACCEPTABLE_SCORE;

  return (
    <div className="flex flex-col gap-1.5">
      {/* 5-segment bar */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="flex-1 h-1.5 rounded-full transition-colors"
            style={{
              background: seg <= score ? color : 'var(--border, #e5e7eb)',
            }}
          />
        ))}
      </div>

      {/* Label + min-acceptable hint */}
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between text-[10px] font-bold"
      >
        <span style={{ color }}>
          {meetsMin ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle size={11} weight="fill" /> {label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Warning size={11} weight="fill" /> {label}
            </span>
          )}
        </span>
        <span className="text-[var(--text-tertiary)] font-semibold">
          {meetsMin ? 'Meets minimum' : `Need at least "Fair" to continue`}
        </span>
      </div>

      {/* zxcvbn warning — only shown when present and below threshold */}
      {!meetsMin && warning && (
        <div className="flex items-start gap-1.5 text-[10px] text-[var(--danger)]">
          <Warning size={11} weight="fill" className="flex-shrink-0 mt-[1px]" />
          <span>{warning}</span>
        </div>
      )}

      {/* zxcvbn suggestions — concrete tips for getting to the next level */}
      {suggestions.length > 0 && !meetsMin && (
        <ul className="flex flex-col gap-0.5 m-0 pl-0 list-none">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-[10px] text-[var(--text-tertiary)]"
            >
              <Info size={11} weight="fill" className="flex-shrink-0 mt-[1px] text-[var(--text-tertiary)]" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
