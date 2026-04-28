'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ColumnPinning {
  left: string[];
  right: string[];
}

interface GridLayout {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  columnPinning: ColumnPinning;
}

interface GridLayoutStore {
  grids: Record<string, GridLayout>;
  getGrid: (gridId: string) => GridLayout;
  setColumnOrder: (gridId: string, order: string[]) => void;
  setColumnVisibility: (gridId: string, vis: Record<string, boolean>) => void;
  setColumnWidths: (gridId: string, widths: Record<string, number>) => void;
  updateColumnWidth: (gridId: string, colId: string, width: number) => void;
  setColumnPinning: (gridId: string, pinning: ColumnPinning) => void;
  resetGrid: (gridId: string) => void;
}

const EMPTY_LAYOUT: GridLayout = { columnOrder: [], columnVisibility: {}, columnWidths: {}, columnPinning: { left: [], right: [] } };

export const useGridLayoutStore = create<GridLayoutStore>()(
  persist(
    (set, get) => ({
      grids: {},
      getGrid: (gridId) => {
        const g = get().grids[gridId];
        if (!g) return EMPTY_LAYOUT;
        // Defensive hydration: older persisted layouts may predate columnPinning.
        return g.columnPinning ? g : { ...g, columnPinning: { left: [], right: [] } };
      },
      setColumnOrder: (gridId, order) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...(s.grids[gridId] || EMPTY_LAYOUT), columnOrder: order } },
      })),
      setColumnVisibility: (gridId, vis) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...(s.grids[gridId] || EMPTY_LAYOUT), columnVisibility: vis } },
      })),
      setColumnWidths: (gridId, widths) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...(s.grids[gridId] || EMPTY_LAYOUT), columnWidths: widths } },
      })),
      updateColumnWidth: (gridId, colId, width) => set((s) => {
        const grid = s.grids[gridId] || EMPTY_LAYOUT;
        return {
          grids: { ...s.grids, [gridId]: { ...grid, columnWidths: { ...grid.columnWidths, [colId]: width } } },
        };
      }),
      setColumnPinning: (gridId, pinning) => set((s) => ({
        grids: { ...s.grids, [gridId]: { ...(s.grids[gridId] || EMPTY_LAYOUT), columnPinning: pinning } },
      })),
      resetGrid: (gridId) => set((s) => {
        const next = { ...s.grids };
        delete next[gridId];
        return { grids: next };
      }),
    }),
    { name: 'roadrunner-grid-layouts' }
  )
);
