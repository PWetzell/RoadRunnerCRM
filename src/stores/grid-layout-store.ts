'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ColumnPinning {
  left: string[];
  right: string[];
}

export interface GridSort {
  id: string;
  desc: boolean;
}

export interface SavedGridView {
  id: string;
  name: string;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  columnVisibility: Record<string, boolean>;
  sorting: GridSort[];
}

interface GridLayout {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  columnPinning: ColumnPinning;
  /**
   * Sort state — persisted so a user-applied sort survives a refresh.
   * Empty array means "use the grid's defaultSorting prop instead".
   */
  sorting: GridSort[];
  /**
   * Per-column filter state. Persisted so that filters set via the
   * column-header funnel icon survive a page refresh.
   * Stored as { id, value } pairs (TanStack ColumnFiltersState shape).
   */
  columnFilters: Array<{ id: string; value: unknown }>;
  /** User-saved view definitions (named snapshots of grid state). */
  savedViews: SavedGridView[];
  /** Currently active saved view; null when the grid is in default/Custom mode. */
  activeViewId: string | null;
}

interface GridLayoutStore {
  grids: Record<string, GridLayout>;
  /**
   * Card-view filter / sort state, keyed by scope ("contacts", "sales",
   * "recruiting", "documents"). Each card view stores its own JSON blob
   * (sortBy, statusFilter, dateFrom, etc.) so the user's selections
   * survive a refresh.
   */
  cardViewState: Record<string, Record<string, unknown>>;
  getGrid: (gridId: string) => GridLayout;
  setColumnOrder: (gridId: string, order: string[]) => void;
  setColumnVisibility: (gridId: string, vis: Record<string, boolean>) => void;
  setColumnWidths: (gridId: string, widths: Record<string, number>) => void;
  updateColumnWidth: (gridId: string, colId: string, width: number) => void;
  setColumnPinning: (gridId: string, pinning: ColumnPinning) => void;
  setSorting: (gridId: string, sorting: GridSort[]) => void;
  setColumnFilters: (gridId: string, filters: Array<{ id: string; value: unknown }>) => void;
  setSavedViews: (gridId: string, views: SavedGridView[]) => void;
  setActiveViewId: (gridId: string, id: string | null) => void;
  setCardViewState: (scope: string, state: Record<string, unknown>) => void;
  getCardViewState: (scope: string) => Record<string, unknown>;
  resetGrid: (gridId: string) => void;
}

const EMPTY_LAYOUT: GridLayout = {
  columnOrder: [],
  columnVisibility: {},
  columnWidths: {},
  columnPinning: { left: [], right: [] },
  sorting: [],
  columnFilters: [],
  savedViews: [],
  activeViewId: null,
};

/**
 * Defensive hydration: older persisted layouts may be missing newer fields
 * (columnPinning was added later, then sorting / savedViews / activeViewId).
 * We backfill defaults so existing users don't crash on read after upgrade.
 */
function hydrate(g: Partial<GridLayout> | undefined): GridLayout {
  if (!g) return EMPTY_LAYOUT;
  return {
    columnOrder: g.columnOrder ?? [],
    columnVisibility: g.columnVisibility ?? {},
    columnWidths: g.columnWidths ?? {},
    columnPinning: g.columnPinning ?? { left: [], right: [] },
    sorting: g.sorting ?? [],
    columnFilters: g.columnFilters ?? [],
    savedViews: g.savedViews ?? [],
    activeViewId: g.activeViewId ?? null,
  };
}

export const useGridLayoutStore = create<GridLayoutStore>()(
  persist(
    (set, get) => ({
      grids: {},
      cardViewState: {},
      getGrid: (gridId) => hydrate(get().grids[gridId]),
      getCardViewState: (scope) => get().cardViewState?.[scope] ?? {},
      setCardViewState: (scope, state) => set((s) => ({
        cardViewState: { ...(s.cardViewState ?? {}), [scope]: state },
      })),
      setColumnOrder: (gridId, order) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), columnOrder: order } },
      })),
      setColumnVisibility: (gridId, vis) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), columnVisibility: vis } },
      })),
      setColumnWidths: (gridId, widths) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), columnWidths: widths } },
      })),
      updateColumnWidth: (gridId, colId, width) => set((s) => {
        const grid = hydrate(s.grids[gridId]);
        return {
          grids: { ...s.grids, [gridId]: { ...grid, columnWidths: { ...grid.columnWidths, [colId]: width } } },
        };
      }),
      setColumnPinning: (gridId, pinning) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), columnPinning: pinning } },
      })),
      setSorting: (gridId, sorting) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), sorting } },
      })),
      setColumnFilters: (gridId, filters) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), columnFilters: filters } },
      })),
      setSavedViews: (gridId, views) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), savedViews: views } },
      })),
      setActiveViewId: (gridId, id) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...hydrate(s.grids[gridId]), activeViewId: id } },
      })),
      resetGrid: (gridId) => set((s) => {
        const next = { ...s.grids };
        delete next[gridId];
        return { grids: next };
      }),
    }),
    { name: 'roadrunner-grid-layouts', version: 2 }
  )
);
