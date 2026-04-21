'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WidgetConfig, WidgetType, WIDGET_META_MAP, InsertPosition } from '@/types/dashboard';
import { REPORT_PRESETS } from '@/lib/report-presets';

/**
 * Reporting dashboard store — mirrors the main dashboard store's
 * saved-view architecture so users get the same View picker, save-as,
 * rename, delete experience on the Reporting page.
 */

export interface ReportingView {
  id: string;
  name: string;
  /** Which report preset this was based on (for Reset). */
  reportType: string;
  preset?: boolean;
  widgets: WidgetConfig[];
}

// Build preset views from report presets
const PRESET_VIEWS: ReportingView[] = REPORT_PRESETS.map((p) => ({
  id: `report-${p.id}`,
  name: p.label,
  reportType: p.id,
  preset: true,
  widgets: p.widgets,
}));

interface ReportingDashboardStore {
  views: ReportingView[];
  activeViewId: string;

  setActiveViewId: (id: string) => void;

  // Widget ops (on active view)
  reorderWidgets: (fromId: string, toId: string) => void;
  resizeWidget: (id: string, size: WidgetConfig['size']) => void;
  removeWidget: (id: string) => void;
  addWidget: (type: WidgetType, position?: InsertPosition, initialConfig?: Record<string, unknown>) => void;
  setWidgetHeaderColor: (id: string, color: string | undefined) => void;
  setWidgetStyle: (id: string, patch: Partial<WidgetConfig>) => void;
  updateWidgetConfig: (id: string, config: Record<string, unknown>) => void;

  // View ops
  saveAsView: (name: string) => void;
  renameView: (id: string, name: string) => void;
  deleteView: (id: string) => void;
  resetActiveView: () => void;
  /** Create a brand-new dashboard view populated with the given custom-report
   *  widgets (config.reportId), activate it, and return its id. Used by the
   *  Report Library's "Compose dashboard from selection" flow. */
  composeViewFromReports: (name: string, reportIds: string[]) => string;
  /** Merge the widgets from multiple source views into a new view. Duplicate
   *  custom-report widgets (same config.reportId) are collapsed to one copy
   *  so the merged dashboard stays readable. Returns the new view id. */
  mergeViews: (name: string, sourceViewIds: string[]) => string;

  // Convenience
  widgets: WidgetConfig[];
  resetLayout: () => void;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Avoid duplicate view names by appending (2), (3), … if base already exists. */
function uniqueName(base: string, existing: { name: string }[]): string {
  const names = new Set(existing.map((v) => v.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} (${i})`)) i += 1;
  return `${base} (${i})`;
}

export const useReportingDashboardStore = create<ReportingDashboardStore>()(
  persist(
    (set, get) => ({
      views: PRESET_VIEWS,
      activeViewId: 'report-pipeline-health',

      get widgets() { return get().views.find((v) => v.id === get().activeViewId)?.widgets || []; },

      setActiveViewId: (id) => set({ activeViewId: id }),

      reorderWidgets: (fromId, toId) => set((s) => ({
        views: s.views.map((v) => {
          if (v.id !== s.activeViewId) return v;
          const ws = [...v.widgets];
          const fi = ws.findIndex((w) => w.id === fromId);
          const ti = ws.findIndex((w) => w.id === toId);
          if (fi < 0 || ti < 0) return v;
          const [m] = ws.splice(fi, 1);
          ws.splice(ti, 0, m);
          return { ...v, widgets: ws, preset: false };
        }),
      })),

      resizeWidget: (id, size) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, size } : w), preset: false } : v
        ),
      })),

      removeWidget: (id) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId ? { ...v, widgets: v.widgets.filter((w) => w.id !== id), preset: false } : v
        ),
      })),

      addWidget: (type, position = 'end', initialConfig) => set((s) => {
        const meta = WIDGET_META_MAP[type];
        const nw: WidgetConfig = {
          id: uid('rw'),
          type,
          size: meta?.defaultSize || { cols: 2, rows: 2 },
          ...(initialConfig ? { config: initialConfig } : {}),
        };
        return {
          views: s.views.map((v) => {
            if (v.id !== s.activeViewId) return v;
            let widgets: WidgetConfig[];
            if (position === 'start') widgets = [nw, ...v.widgets];
            else if (typeof position === 'object' && 'afterId' in position) {
              const idx = v.widgets.findIndex((w) => w.id === position.afterId);
              widgets = idx < 0 ? [...v.widgets, nw] : [...v.widgets.slice(0, idx + 1), nw, ...v.widgets.slice(idx + 1)];
            } else widgets = [...v.widgets, nw];
            return { ...v, widgets, preset: false };
          }),
        };
      }),

      setWidgetHeaderColor: (id, color) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, headerColor: color } : w), preset: false } : v
        ),
      })),

      setWidgetStyle: (id, patch) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, ...patch } : w), preset: false } : v
        ),
      })),

      updateWidgetConfig: (id, config) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, config: { ...(w.config || {}), ...config } } : w) } : v
        ),
      })),

      saveAsView: (name) => set((s) => {
        const active = s.views.find((v) => v.id === s.activeViewId);
        if (!active) return s;
        const newView: ReportingView = {
          id: uid('rv'),
          name: uniqueName(name, s.views),
          reportType: active.reportType,
          widgets: active.widgets.map((w) => ({ ...w, id: uid('rw') })),
        };
        return { views: [...s.views, newView], activeViewId: newView.id };
      }),

      renameView: (id, name) => set((s) => ({
        views: s.views.map((v) => v.id === id && !v.preset ? { ...v, name } : v),
      })),

      deleteView: (id) => set((s) => {
        if (s.views.find((v) => v.id === id)?.preset) return s;
        const remaining = s.views.filter((v) => v.id !== id);
        return {
          views: remaining,
          activeViewId: s.activeViewId === id ? remaining[0]?.id || 'report-pipeline-health' : s.activeViewId,
        };
      }),

      mergeViews: (name, sourceViewIds) => {
        const state = get();
        const safeName = uniqueName(name, state.views);
        // Walk each source view's widgets in order, deduping custom-report widgets
        // by reportId and deduping built-in widgets by type (no sense showing
        // two "Open deals" KPIs side by side).
        const seenReportIds = new Set<string>();
        const seenTypes = new Set<string>();
        const mergedWidgets: WidgetConfig[] = [];
        for (const srcId of sourceViewIds) {
          const v = state.views.find((x) => x.id === srcId);
          if (!v) continue;
          for (const w of v.widgets) {
            if (w.type === 'custom-report') {
              const rid = (w.config?.reportId as string | undefined) ?? '';
              if (rid && seenReportIds.has(rid)) continue;
              if (rid) seenReportIds.add(rid);
            } else {
              if (seenTypes.has(w.type)) continue;
              seenTypes.add(w.type);
            }
            mergedWidgets.push({ ...w, id: uid('rw') });
          }
        }
        const newView: ReportingView = {
          id: uid('rv'),
          name: safeName,
          reportType: 'merged',
          widgets: mergedWidgets,
        };
        set((s) => ({ views: [...s.views, newView], activeViewId: newView.id }));
        return newView.id;
      },

      composeViewFromReports: (name, reportIds) => {
        const state = get();
        const safeName = uniqueName(name, state.views);
        const meta = WIDGET_META_MAP['custom-report'];
        const size = meta?.defaultSize || { cols: 2, rows: 2 };
        const newView: ReportingView = {
          id: uid('rv'),
          name: safeName,
          reportType: 'custom',
          widgets: reportIds.map((rid) => ({
            id: uid('rw'),
            type: 'custom-report',
            size,
            config: { reportId: rid },
          })),
        };
        set((s) => ({ views: [...s.views, newView], activeViewId: newView.id }));
        return newView.id;
      },

      resetActiveView: () => set((s) => {
        const active = s.views.find((v) => v.id === s.activeViewId);
        if (!active) return s;
        const original = PRESET_VIEWS.find((p) => p.id === active.id);
        if (!original) return s;
        return { views: s.views.map((v) => v.id === s.activeViewId ? original : v) };
      }),

      resetLayout: () => {
        const s = get();
        const active = s.views.find((v) => v.id === s.activeViewId);
        if (!active) return;
        const preset = PRESET_VIEWS.find((p) => p.reportType === active.reportType);
        if (preset) {
          set({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: preset.widgets } : v) });
        }
      },
    }),
    {
      name: 'roadrunner-reporting-dashboard',
      /** Skip automatic rehydration so we can trigger it explicitly after the
       *  client mounts — avoids SSR/client state mismatches in Next.js. */
      skipHydration: true,
      partialize: (s) => ({ views: s.views, activeViewId: s.activeViewId }),
      /**
       * Explicit merge — persisted user views MUST replace the hard-coded
       * presets. Zustand's default shallow merge can miss array replacement
       * in the presence of getters on the state object, which we have via
       * the `get widgets()` computed property.
       */
      merge: (persisted, current) => {
        const p = persisted as Partial<ReportingDashboardStore> | undefined;
        const mergedViews = p?.views && p.views.length > 0 ? p.views : PRESET_VIEWS;
        return {
          ...current,
          ...p,
          views: mergedViews,
          activeViewId: p?.activeViewId ?? 'report-pipeline-health',
        };
      },
    },
  ),
);
