'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Saved card view configurations. Each card view (Contacts, Documents,
 * Recruiting) can save its current filter/sort state as a named view.
 * Views are scoped by a `scope` key so different pages don't collide.
 */

export interface SavedCardView {
  id: string;
  name: string;
  scope: string; // 'contacts' | 'documents' | 'recruiting'
  filters: Record<string, string | boolean>;
}

interface CardViewStore {
  savedViews: SavedCardView[];
  /** Currently active view ID per scope. */
  activeViewIds: Record<string, string | null>;

  saveView: (view: SavedCardView) => void;
  deleteView: (id: string) => void;
  renameView: (id: string, name: string) => void;
  setActiveView: (scope: string, id: string | null) => void;
  getViewsForScope: (scope: string) => SavedCardView[];
  getActiveView: (scope: string) => SavedCardView | undefined;
}

function uid() { return `cv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

export const useCardViewStore = create<CardViewStore>()(
  persist(
    (set, get) => ({
      savedViews: [],
      activeViewIds: {},

      saveView: (view) => set((s) => ({
        savedViews: [...s.savedViews, { ...view, id: view.id || uid() }],
        activeViewIds: { ...s.activeViewIds, [view.scope]: view.id || uid() },
      })),

      deleteView: (id) => set((s) => {
        const view = s.savedViews.find((v) => v.id === id);
        const next = s.savedViews.filter((v) => v.id !== id);
        const activeIds = { ...s.activeViewIds };
        if (view && activeIds[view.scope] === id) activeIds[view.scope] = null;
        return { savedViews: next, activeViewIds: activeIds };
      }),

      renameView: (id, name) => set((s) => ({
        savedViews: s.savedViews.map((v) => v.id === id ? { ...v, name } : v),
      })),

      setActiveView: (scope, id) => set((s) => ({
        activeViewIds: { ...s.activeViewIds, [scope]: id },
      })),

      getViewsForScope: (scope) => get().savedViews.filter((v) => v.scope === scope),

      getActiveView: (scope) => {
        const id = get().activeViewIds[scope];
        return id ? get().savedViews.find((v) => v.id === id) : undefined;
      },
    }),
    { name: 'roadrunner-card-views' },
  ),
);
