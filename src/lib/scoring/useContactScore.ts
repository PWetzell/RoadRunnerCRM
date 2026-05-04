'use client';

import { useMemo } from 'react';
import { useContactStore } from '@/stores/contact-store';
import { useSalesStore } from '@/stores/sales-store';
import { useSequenceStore } from '@/stores/sequence-store';
import { useScoringStore } from '@/stores/scoring-store';
import { computeScore } from '@/lib/scoring/computeScore';
import type { ScoreContext } from '@/lib/scoring/computeScore';
import type { ScoreResult } from '@/types/scoring';

/**
 * Compute one contact's quality score with React-friendly memoization.
 *
 * Subscribes to the four underlying stores (contacts, deals, enrollments,
 * scoring rules) via narrow selectors. The actual `computeScore()` call
 * lives inside `useMemo` so the engine only re-runs when the contact, a
 * rule, or the relevant data identity actually changes.
 *
 * Returns `null` when the contact isn't found or isn't a Person (Org rows
 * are unscored in v1). Callers render nothing on null.
 */
export function useContactScore(contactId: string): ScoreResult | null {
  const contacts = useContactStore((s) => s.contacts);
  const deals = useSalesStore((s) => s.deals);
  const enrollments = useSequenceStore((s) => s.enrollments);
  const rules = useScoringStore((s) => s.rules);

  return useMemo(() => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.type !== 'person') return null;
    const ctx: ScoreContext = {
      contacts,
      deals,
      enrollments: enrollments.map((e) => ({
        contactId: e.contactId,
        status: e.status,
        enrolledAt: e.enrolledAt,
        sendLog: e.sendLog,
      })),
      now: Date.now(),
    };
    return computeScore(contact, rules, ctx);
  }, [contactId, contacts, deals, enrollments, rules]);
}
