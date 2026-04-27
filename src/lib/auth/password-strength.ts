'use client';

import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/**
 * zxcvbn-ts wrapper.
 *
 * Why zxcvbn over "must contain Aa1!" rules: NIST 800-63B (2017+) explicitly
 * recommends against complexity rules — they don't measurably improve real
 * password strength but add friction. zxcvbn estimates *actual* entropy by
 * checking the password against:
 *   • English dictionaries (common words, names, places)
 *   • Common patterns (CapitalWord@123, qwerty, abc123)
 *   • Keyboard walks (asdf, qaz)
 *   • Known leaked password lists (top-10k common passwords)
 *
 * It returns:
 *   • `score` — integer 0-4 (Too weak / Weak / Fair / Strong / Very strong)
 *   • `feedback.warning` — the reason it's weak (e.g. "This is similar to a commonly used password")
 *   • `feedback.suggestions` — concrete tips ("Add another word or two", "Avoid sequences")
 *
 * Used in production by Stripe, GitHub, 1Password, Dropbox.
 */

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  zxcvbnOptions.setOptions({
    translations: zxcvbnEnPackage.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
  });
  initialized = true;
}

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordEvaluation {
  score: PasswordScore;
  /** Top-line reason it's weak, if any. Empty string when strong. */
  warning: string;
  /** Concrete improvement tips. Empty array when strong. */
  suggestions: string[];
  /** Human label for the score band. */
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  /** Hex color matching the score band — used by the meter. */
  color: string;
}

/**
 * Minimum acceptable score for sign-up. We require **Fair (2)** — that's
 * the same threshold GitHub and 1Password use. Below this, common
 * dictionary words and predictable patterns get blocked; above it,
 * passwords have enough entropy that brute-force becomes infeasible at
 * realistic offline-attack rates (~10^10 guesses).
 */
export const MIN_ACCEPTABLE_SCORE: PasswordScore = 2;

const LABELS: PasswordEvaluation['label'][] = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
// Tailwind-ish swatches; we read CSS vars where available so the bar
// adapts to dark mode through the existing token system.
const COLORS = [
  'var(--danger, #dc2626)',     // 0 Too weak — red
  'var(--danger, #dc2626)',     // 1 Weak — red
  'var(--warning, #d97706)',    // 2 Fair — amber
  'var(--success, #16a34a)',    // 3 Strong — green
  'var(--success, #16a34a)',    // 4 Very strong — green
];

/**
 * Evaluate a password. Pass `userInputs` (e.g. the user's name + email)
 * so zxcvbn knows to penalize passwords derived from their identity —
 * "PaulWentzell123" should rank weak even though the dictionary doesn't
 * know "Wentzell."
 */
export function evaluatePassword(password: string, userInputs: string[] = []): PasswordEvaluation {
  ensureInitialized();
  if (!password) {
    return {
      score: 0,
      warning: '',
      suggestions: [],
      label: 'Too weak',
      color: COLORS[0],
    };
  }
  const result = zxcvbn(password, userInputs);
  const score = result.score as PasswordScore;
  return {
    score,
    warning: result.feedback.warning || '',
    suggestions: result.feedback.suggestions || [],
    label: LABELS[score],
    color: COLORS[score],
  };
}
