'use client';

import { createContext, useContext } from 'react';
import { WidgetConfig } from '@/types/dashboard';

/**
 * Context that provides widget write operations. This lets the Widget
 * component work with ANY backing store (main dashboard, reporting
 * dashboard, admin dashboard) without hardcoding useDashboardStore.
 *
 * Each page wraps its widget grid in a <WidgetStoreProvider> that
 * binds the correct store's actions.
 */
export interface WidgetStoreActions {
  removeWidget: (id: string) => void;
  resizeWidget: (id: string, size: WidgetConfig['size']) => void;
  setWidgetHeaderColor: (id: string, color: string | undefined) => void;
  setWidgetStyle: (id: string, patch: Partial<WidgetConfig>) => void;
  updateWidgetConfig: (id: string, config: Record<string, unknown>) => void;
}

const WidgetStoreContext = createContext<WidgetStoreActions | null>(null);

export function WidgetStoreProvider({ actions, children }: { actions: WidgetStoreActions; children: React.ReactNode }) {
  return <WidgetStoreContext.Provider value={actions}>{children}</WidgetStoreContext.Provider>;
}

export function useWidgetStoreActions(): WidgetStoreActions {
  const ctx = useContext(WidgetStoreContext);
  if (!ctx) throw new Error('useWidgetStoreActions must be used inside WidgetStoreProvider');
  return ctx;
}

/**
 * Hook that returns actions OR falls back to null if no provider is set.
 * Used by Widget.tsx so it works both inside a provider (reporting/admin)
 * and without one (main dashboard, which uses useDashboardStore directly).
 */
export function useWidgetStoreActionsOptional(): WidgetStoreActions | null {
  return useContext(WidgetStoreContext);
}
