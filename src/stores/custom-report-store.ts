'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomReport } from '@/types/custom-report';
import { SEED_CUSTOM_REPORTS } from '@/lib/data/seed-custom-reports';

interface CustomReportStore {
  reports: CustomReport[];

  // UI state
  builderOpen: boolean;
  editingReportId: string | null;
  /** If set, after save the builder will invoke this callback with the saved
   *  report id — used by the Add Widget flow to auto-add the new report to
   *  the current dashboard view. */
  onSaveCallback?: (reportId: string) => void;

  /** When set, a hidden print-only DOM host renders these reports full-page
   *  and the browser print dialog is triggered. Supports either a single id
   *  (single-report print) or a list (Print-all multi-page packet). */
  printingReportIds: string[] | null;

  // Builder open/close
  openBuilder: (id?: string, onSave?: (reportId: string) => void) => void;
  closeBuilder: () => void;

  // Print
  startPrint: (ids: string | string[]) => void;
  endPrint: () => void;

  // CRUD
  createReport: (input: Omit<CustomReport, 'id' | 'createdAt' | 'updatedAt'>) => CustomReport;
  updateReport: (id: string, patch: Partial<Omit<CustomReport, 'id' | 'createdAt'>>) => void;
  duplicateReport: (id: string) => CustomReport | undefined;
  deleteReport: (id: string) => void;

  // Lookup
  getReport: (id: string) => CustomReport | undefined;
}

function uid() {
  return `rpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useCustomReportStore = create<CustomReportStore>()(
  persist(
    (set, get) => ({
      reports: SEED_CUSTOM_REPORTS,

      builderOpen: false,
      editingReportId: null,
      onSaveCallback: undefined,
      printingReportIds: null,

      openBuilder: (id, onSave) => set({
        builderOpen: true,
        editingReportId: id ?? null,
        onSaveCallback: onSave,
      }),
      closeBuilder: () => set({
        builderOpen: false,
        editingReportId: null,
        onSaveCallback: undefined,
      }),

      startPrint: (ids) => set({ printingReportIds: Array.isArray(ids) ? ids : [ids] }),
      endPrint: () => set({ printingReportIds: null }),

      createReport: (input) => {
        const now = new Date().toISOString();
        const report: CustomReport = {
          ...input,
          id: uid(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ reports: [report, ...s.reports] }));
        return report;
      },

      updateReport: (id, patch) => set((s) => ({
        reports: s.reports.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
        ),
      })),

      duplicateReport: (id) => {
        const original = get().reports.find((r) => r.id === id);
        if (!original) return undefined;
        const now = new Date().toISOString();
        const copy: CustomReport = {
          ...original,
          id: uid(),
          name: `${original.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ reports: [copy, ...s.reports] }));
        return copy;
      },

      deleteReport: (id) => set((s) => ({
        reports: s.reports.filter((r) => r.id !== id),
      })),

      getReport: (id) => get().reports.find((r) => r.id === id),
    }),
    {
      name: 'roadrunner-custom-reports',
      skipHydration: true,
      partialize: (s) => ({ reports: s.reports }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<CustomReportStore> | undefined;
        return {
          ...current,
          ...p,
          reports: p?.reports ?? SEED_CUSTOM_REPORTS,
          // Never persist UI state
          builderOpen: false,
          editingReportId: null,
          onSaveCallback: undefined,
          printingReportIds: null,
        };
      },
    },
  ),
);
