'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContentTextSize } from '@/types/dashboard';

/**
 * Per-card visual style overrides. Keyed by a stable card ID (e.g.,
 * "kanban-deal-1", "report-pipeline-funnel", "admin-users"). Cards
 * that haven't been customized simply don't appear in the map.
 *
 * This store is separate from the dashboard widget store because these
 * cards aren't dashboard widgets — they're native page elements (kanban
 * cards, report sections, admin panels) that share the same Edit Card UX.
 */
export interface CardStyle {
  headerColor?: string;
  iconName?: string;
  iconColor?: string;
  titleColor?: string;
  titleSize?: ContentTextSize;
  contentTextColor?: string;
  contentTextSize?: ContentTextSize;
  subtitleColor?: string;
  subtitleSize?: ContentTextSize;
  contentAlign?: 'left' | 'center' | 'right';
}

const EMPTY_STYLE: CardStyle = {};

interface CardStyleStore {
  styles: Record<string, CardStyle>;
  /** Returns the style for a card, or a shared empty-object reference when
   *  no style is set. IMPORTANT: never construct a new object here — that
   *  causes infinite re-renders when consumers pass this return value as a
   *  zustand selector. */
  getStyle: (cardId: string) => CardStyle;
  setStyle: (cardId: string, patch: Partial<CardStyle>) => void;
  resetStyle: (cardId: string) => void;
}

export const useCardStyleStore = create<CardStyleStore>()(
  persist(
    (set, get) => ({
      styles: {},

      // Return a shared empty-object reference when no style is set, so
      // zustand selectors using this in their render path don't trigger
      // infinite update loops (new {} each call would never equal previous).
      getStyle: (cardId) => get().styles[cardId] || EMPTY_STYLE,

      setStyle: (cardId, patch) => set((s) => ({
        styles: {
          ...s.styles,
          [cardId]: { ...(s.styles[cardId] || {}), ...patch },
        },
      })),

      resetStyle: (cardId) => set((s) => {
        const next = { ...s.styles };
        delete next[cardId];
        return { styles: next };
      }),
    }),
    {
      name: 'roadrunner-card-styles',
    },
  ),
);
