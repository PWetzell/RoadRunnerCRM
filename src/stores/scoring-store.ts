'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScoringRule } from '@/types/scoring';
import { DEFAULT_RULES } from '@/lib/scoring/seed-rules';

interface ScoringStore {
  rules: ScoringRule[];

  /** Add a new rule. Returns the generated id. */
  addRule: (rule: Omit<ScoringRule, 'id'>) => string;
  /** Patch an existing rule's name / category / points / active / condition. */
  updateRule: (id: string, patch: Partial<Omit<ScoringRule, 'id'>>) => void;
  /** Flip just the `active` flag — convenience for the rule-table toggle. */
  toggleRule: (id: string) => void;
  deleteRule: (id: string) => void;
  /** Restore the built-in 15-rule set verbatim. Drops any custom rules. */
  resetToDefaults: () => void;
}

function uid() {
  return `rule-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Quality Score rule store.
 *
 * `skipHydration: true` matches the dashboard / custom-report /
 * reporting-dashboard stores: render seed rules immediately on first
 * paint to avoid SSR↔client hydration flash, then swap in any persisted
 * overrides after `useScoringStore.persist.rehydrate()` runs in a page
 * `useEffect`. Pages that consume scoring state (the contacts page in
 * Phase 1) call rehydrate on mount.
 */
export const useScoringStore = create<ScoringStore>()(
  persist(
    (set) => ({
      rules: DEFAULT_RULES,

      addRule: (input) => {
        const id = uid();
        set((s) => ({ rules: [...s.rules, { id, ...input } as ScoringRule] }));
        return id;
      },
      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? ({ ...r, ...patch } as ScoringRule) : r)),
        })),
      toggleRule: (id) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
        })),
      deleteRule: (id) =>
        set((s) => ({
          rules: s.rules.filter((r) => r.id !== id),
        })),
      resetToDefaults: () => set({ rules: DEFAULT_RULES }),
    }),
    {
      name: 'roadrunner-scoring-rules',
      skipHydration: true,
    },
  ),
);
