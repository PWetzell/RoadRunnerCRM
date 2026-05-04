'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WidgetConfig, WidgetType, WIDGET_META_MAP, InsertPosition } from '@/types/dashboard';

export interface AdminView {
  id: string;
  name: string;
  preset?: boolean;
  widgets: WidgetConfig[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'aw-1', type: 'kpi-active-contacts' as WidgetType, size: { cols: 1, rows: 1 }, title: 'Users' },
  { id: 'aw-2', type: 'kpi-active-contacts' as WidgetType, size: { cols: 1, rows: 1 }, title: 'Contacts' },
  { id: 'aw-3', type: 'kpi-open-deals' as WidgetType,      size: { cols: 1, rows: 1 }, title: 'Deals' },
  { id: 'aw-4', type: 'kpi-active-contacts' as WidgetType, size: { cols: 1, rows: 1 }, title: 'Documents' },
  { id: 'aw-5', type: 'kpi-active-contacts' as WidgetType, size: { cols: 1, rows: 1 }, title: 'Roles' },
  { id: 'aw-6', type: 'kpi-active-contacts' as WidgetType, size: { cols: 1, rows: 1 }, title: 'Storage' },
  // Quality Score split into three independently-draggable cards.
  // Each can be hidden via the gear menu, repositioned via drag, or
  // re-added from the Add Widget toolbar. Sizes chosen to fit content
  // without internal scrolling — browser handles overflow at the
  // page level.
  { id: 'aw-score-kpis',         type: 'score-kpis'         as WidgetType, size: { cols: 4, rows: 1 } },
  { id: 'aw-score-distribution', type: 'score-distribution' as WidgetType, size: { cols: 4, rows: 2 } },
  { id: 'aw-scoring-rules',      type: 'scoring-rules'      as WidgetType, size: { cols: 4, rows: 6 } },
];

const PRESET_VIEWS: AdminView[] = [
  { id: 'admin-overview', name: 'Overview', preset: true, widgets: DEFAULT_WIDGETS },
];

function uid(p: string) { return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

interface AdminDashboardStore {
  views: AdminView[];
  activeViewId: string;
  setActiveViewId: (id: string) => void;
  reorderWidgets: (fromId: string, toId: string) => void;
  resizeWidget: (id: string, size: WidgetConfig['size']) => void;
  removeWidget: (id: string) => void;
  addWidget: (type: WidgetType, position?: InsertPosition) => void;
  setWidgetHeaderColor: (id: string, color: string | undefined) => void;
  setWidgetStyle: (id: string, patch: Partial<WidgetConfig>) => void;
  updateWidgetConfig: (id: string, config: Record<string, unknown>) => void;
  saveAsView: (name: string) => void;
  renameView: (id: string, name: string) => void;
  deleteView: (id: string) => void;
  resetActiveView: () => void;
  resetLayout: () => void;
}

export const useAdminDashboardStore = create<AdminDashboardStore>()(
  persist(
    (set, get) => ({
      views: PRESET_VIEWS,
      activeViewId: 'admin-overview',
      setActiveViewId: (id) => set({ activeViewId: id }),

      reorderWidgets: (fromId, toId) => set((s) => ({
        views: s.views.map((v) => {
          if (v.id !== s.activeViewId) return v;
          const ws = [...v.widgets]; const fi = ws.findIndex((w) => w.id === fromId); const ti = ws.findIndex((w) => w.id === toId);
          if (fi < 0 || ti < 0) return v; const [m] = ws.splice(fi, 1); ws.splice(ti, 0, m);
          return { ...v, widgets: ws, preset: false };
        }),
      })),
      resizeWidget: (id, size) => set((s) => ({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, size } : w), preset: false } : v) })),
      removeWidget: (id) => set((s) => ({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: v.widgets.filter((w) => w.id !== id), preset: false } : v) })),
      addWidget: (type, position = 'end') => set((s) => {
        const meta = WIDGET_META_MAP[type];
        const nw: WidgetConfig = { id: uid('aw'), type, size: meta?.defaultSize || { cols: 2, rows: 2 } };
        return { views: s.views.map((v) => { if (v.id !== s.activeViewId) return v; return { ...v, widgets: position === 'start' ? [nw, ...v.widgets] : [...v.widgets, nw], preset: false }; }) };
      }),
      setWidgetHeaderColor: (id, color) => set((s) => ({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, headerColor: color } : w), preset: false } : v) })),
      setWidgetStyle: (id, patch) => set((s) => ({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, ...patch } : w), preset: false } : v) })),
      updateWidgetConfig: (id, config) => set((s) => ({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: v.widgets.map((w) => w.id === id ? { ...w, config: { ...(w.config || {}), ...config } } : w) } : v) })),

      saveAsView: (name) => set((s) => {
        const active = s.views.find((v) => v.id === s.activeViewId);
        if (!active) return s;
        const nv: AdminView = { id: uid('av'), name, widgets: active.widgets.map((w) => ({ ...w, id: uid('aw') })) };
        return { views: [...s.views, nv], activeViewId: nv.id };
      }),
      renameView: (id, name) => set((s) => ({ views: s.views.map((v) => v.id === id && !v.preset ? { ...v, name } : v) })),
      deleteView: (id) => set((s) => {
        if (s.views.find((v) => v.id === id)?.preset) return s;
        const rem = s.views.filter((v) => v.id !== id);
        return { views: rem, activeViewId: s.activeViewId === id ? rem[0]?.id || 'admin-overview' : s.activeViewId };
      }),
      resetActiveView: () => set((s) => {
        const orig = PRESET_VIEWS.find((p) => p.id === s.activeViewId);
        if (!orig) return s;
        return { views: s.views.map((v) => v.id === s.activeViewId ? orig : v) };
      }),
      resetLayout: () => { const s = get(); set({ views: s.views.map((v) => v.id === s.activeViewId ? { ...v, widgets: DEFAULT_WIDGETS } : v) }); },
    }),
    // v3 split the combined scoring-rules widget into three
    // independently-draggable cards (score-kpis, score-distribution,
    // scoring-rules). Bumping the cache name re-seeds defaults so
    // users see the new layout instead of v2's single combined card.
    { name: 'roadrunner-admin-dashboard-v3', partialize: (s) => ({ views: s.views, activeViewId: s.activeViewId }) },
  ),
);
