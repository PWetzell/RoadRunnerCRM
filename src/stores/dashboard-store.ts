'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DashboardView, WidgetConfig, WidgetType, WIDGET_META_MAP, InsertPosition } from '@/types/dashboard';

/** Build-in preset views. Users can clone/edit these or start from scratch. */
const PRESET_VIEWS: DashboardView[] = [
  {
    id: 'preset-sales',
    name: 'Sales Rep',
    role: 'sales',
    preset: true,
    widgets: [
      { id: 'w-s1', type: 'kpi-open-deals',          size: { cols: 1, rows: 1 } },
      { id: 'w-s2', type: 'kpi-pipeline-value',      size: { cols: 1, rows: 1 } },
      { id: 'w-s3', type: 'kpi-won-this-month',      size: { cols: 1, rows: 1 } },
      { id: 'w-s4', type: 'kpi-stalled-deals',       size: { cols: 1, rows: 1 } },
      { id: 'w-s5', type: 'chart-pipeline-by-stage', size: { cols: 2, rows: 2 } },
      { id: 'w-s6', type: 'list-recent-deals',       size: { cols: 2, rows: 2 } },
      { id: 'w-s7', type: 'todo',                    size: { cols: 2, rows: 2 } },
      { id: 'w-s8', type: 'ai-suggestions',          size: { cols: 2, rows: 2 } },
    ],
  },
  {
    id: 'preset-recruiter',
    name: 'Recruiter',
    role: 'recruiter',
    preset: true,
    widgets: [
      { id: 'w-r1', type: 'kpi-active-contacts',     size: { cols: 1, rows: 1 } },
      { id: 'w-r2', type: 'kpi-incomplete-contacts', size: { cols: 1, rows: 1 } },
      { id: 'w-r3', type: 'kpi-open-deals',          size: { cols: 1, rows: 1 } },
      { id: 'w-r4', type: 'kpi-stalled-deals',       size: { cols: 1, rows: 1 } },
      { id: 'w-r5', type: 'list-recent-contacts',    size: { cols: 2, rows: 2 } },
      { id: 'w-r6', type: 'list-stalled-deals',      size: { cols: 2, rows: 2 } },
      { id: 'w-r7', type: 'todo',                    size: { cols: 2, rows: 2 } },
      { id: 'w-r8', type: 'ai-suggestions',          size: { cols: 2, rows: 2 } },
    ],
  },
  {
    id: 'preset-manager',
    name: 'Manager',
    role: 'manager',
    preset: true,
    widgets: [
      { id: 'w-m1', type: 'kpi-open-deals',           size: { cols: 1, rows: 1 } },
      { id: 'w-m2', type: 'kpi-pipeline-value',       size: { cols: 1, rows: 1 } },
      { id: 'w-m3', type: 'kpi-won-this-month',       size: { cols: 1, rows: 1 } },
      { id: 'w-m4', type: 'kpi-active-contacts',      size: { cols: 1, rows: 1 } },
      { id: 'w-m5', type: 'chart-pipeline-by-stage',  size: { cols: 2, rows: 2 } },
      { id: 'w-m6', type: 'chart-deals-by-source',    size: { cols: 2, rows: 2 } },
      { id: 'w-m7', type: 'list-stalled-deals',       size: { cols: 4, rows: 2 } },
    ],
  },
];

interface DashboardStore {
  views: DashboardView[];
  activeViewId: string;
  /** Edit mode shows drag handles + resize controls + remove buttons. */
  editMode: boolean;

  setEditMode: (v: boolean) => void;
  setActiveViewId: (id: string) => void;

  /** Get the currently active view (memo-friendly selector target). */
  getActiveView: () => DashboardView | undefined;

  // ---- Widget ops (operate on active view) ----
  addWidget: (type: WidgetType, position?: InsertPosition, initialConfig?: Record<string, unknown>) => void;
  removeWidget: (widgetId: string) => void;
  reorderWidgets: (fromId: string, toId: string) => void;
  resizeWidget: (widgetId: string, size: WidgetConfig['size']) => void;
  updateWidgetConfig: (widgetId: string, config: Record<string, unknown>) => void;
  setWidgetHeaderColor: (widgetId: string, color: string | undefined) => void;
  /** Generic style patcher — use for iconName, iconColor, contentAlign, etc. */
  setWidgetStyle: (widgetId: string, patch: Partial<WidgetConfig>) => void;

  // ---- View ops ----
  saveAsView: (name: string) => void;           // clone active + rename
  renameView: (id: string, name: string) => void;
  deleteView: (id: string) => void;
  resetActiveView: () => void;                  // if preset-derived, drop overrides
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

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      views: PRESET_VIEWS,
      activeViewId: 'preset-sales',
      editMode: false,

      setEditMode: (v) => set({ editMode: v }),
      setActiveViewId: (id) => set({ activeViewId: id, editMode: false }),

      getActiveView: () => {
        const s = get();
        return s.views.find((v) => v.id === s.activeViewId);
      },

      addWidget: (type, position = 'end', initialConfig) => set((s) => {
        const meta = WIDGET_META_MAP[type];
        const newWidget: WidgetConfig = {
          id: uid('w'),
          type,
          size: meta.defaultSize,
          ...(initialConfig ? { config: initialConfig } : {}),
        };
        return {
          views: s.views.map((v) => {
            if (v.id !== s.activeViewId) return v;
            let widgets: WidgetConfig[];
            if (position === 'start') {
              widgets = [newWidget, ...v.widgets];
            } else if (typeof position === 'object' && 'afterId' in position) {
              const idx = v.widgets.findIndex((w) => w.id === position.afterId);
              if (idx < 0) widgets = [...v.widgets, newWidget];
              else widgets = [...v.widgets.slice(0, idx + 1), newWidget, ...v.widgets.slice(idx + 1)];
            } else {
              widgets = [...v.widgets, newWidget];
            }
            return { ...v, widgets, preset: false };
          }),
        };
      }),

      removeWidget: (widgetId) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId
            ? { ...v, widgets: v.widgets.filter((w) => w.id !== widgetId), preset: false }
            : v,
        ),
      })),

      reorderWidgets: (fromId, toId) => set((s) => ({
        views: s.views.map((v) => {
          if (v.id !== s.activeViewId) return v;
          const ws = [...v.widgets];
          const fromIdx = ws.findIndex((w) => w.id === fromId);
          const toIdx = ws.findIndex((w) => w.id === toId);
          if (fromIdx < 0 || toIdx < 0) return v;
          const [moved] = ws.splice(fromIdx, 1);
          ws.splice(toIdx, 0, moved);
          return { ...v, widgets: ws, preset: false };
        }),
      })),

      resizeWidget: (widgetId, size) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId
            ? { ...v, widgets: v.widgets.map((w) => (w.id === widgetId ? { ...w, size } : w)), preset: false }
            : v,
        ),
      })),

      updateWidgetConfig: (widgetId, config) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId
            ? { ...v, widgets: v.widgets.map((w) => (w.id === widgetId ? { ...w, config: { ...(w.config || {}), ...config } } : w)) }
            : v,
        ),
      })),

      setWidgetHeaderColor: (widgetId, color) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId
            ? {
                ...v,
                preset: false,
                widgets: v.widgets.map((w) =>
                  w.id === widgetId ? { ...w, headerColor: color } : w,
                ),
              }
            : v,
        ),
      })),

      setWidgetStyle: (widgetId, patch) => set((s) => ({
        views: s.views.map((v) =>
          v.id === s.activeViewId
            ? {
                ...v,
                preset: false,
                widgets: v.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
              }
            : v,
        ),
      })),

      saveAsView: (name) => set((s) => {
        const active = s.views.find((v) => v.id === s.activeViewId);
        if (!active) return s;
        const newView: DashboardView = {
          id: uid('view'),
          name,
          widgets: active.widgets.map((w) => ({ ...w, id: uid('w') })),
        };
        return { views: [...s.views, newView], activeViewId: newView.id, editMode: false };
      }),

      renameView: (id, name) => set((s) => ({
        views: s.views.map((v) => (v.id === id && !v.preset ? { ...v, name } : v)),
      })),

      deleteView: (id) => set((s) => {
        if (s.views.find((v) => v.id === id)?.preset) return s;
        const remaining = s.views.filter((v) => v.id !== id);
        return {
          views: remaining,
          activeViewId: s.activeViewId === id ? remaining[0]?.id || 'preset-sales' : s.activeViewId,
        };
      }),

      resetActiveView: () => set((s) => {
        // If active view was a user-modified preset, restore the preset
        const active = s.views.find((v) => v.id === s.activeViewId);
        if (!active) return s;
        const original = PRESET_VIEWS.find((p) => p.id === active.id);
        if (!original) return s;
        return {
          views: s.views.map((v) => (v.id === s.activeViewId ? original : v)),
        };
      }),
    }),
    {
      name: 'roadrunner-dashboard',
      /** See reporting-dashboard-store — we manually rehydrate on the client
       *  to avoid Zustand v5 + Next.js SSR race conditions. */
      skipHydration: true,
      partialize: (s) => ({ views: s.views, activeViewId: s.activeViewId }),
      /** Explicit merge — ensures persisted user views replace the presets
       *  on hydration instead of being silently dropped by the default merge. */
      merge: (persisted, current) => {
        const p = persisted as Partial<DashboardStore> | undefined;
        return {
          ...current,
          ...p,
          views: p?.views && p.views.length > 0 ? p.views : PRESET_VIEWS,
          activeViewId: p?.activeViewId ?? 'preset-sales',
        };
      },
    },
  ),
);
