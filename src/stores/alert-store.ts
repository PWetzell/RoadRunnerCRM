'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CrmAlert, AlertType, AlertSeverity, AlertSettings, AlertRule, AlertReminder, DEFAULT_ALERT_SETTINGS, severityAtOrAbove } from '@/types/alert';
import { SEED_ALERTS, SEED_RULES, SEED_REMINDERS } from '@/lib/data/seed-alerts';

type CreateTab = 'rule' | 'reminder' | 'quick';

interface AlertStore {
  alerts: CrmAlert[];
  rules: AlertRule[];
  reminders: AlertReminder[];
  settings: AlertSettings;
  /** Panel open state (controlled by bell icon). */
  panelOpen: boolean;
  /** Settings sub-panel open. */
  settingsOpen: boolean;
  /** Custom alert creation open. */
  createOpen: boolean;
  /** Which tab is active in the create dialog. */
  createTab: CreateTab;

  setPanelOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setCreateOpen: (v: boolean) => void;
  setCreateTab: (tab: CreateTab) => void;

  // Alert actions
  addAlert: (alert: Omit<CrmAlert, 'id' | 'createdAt' | 'read' | 'dismissed'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  removeAlert: (id: string) => void;

  // Settings actions
  updateSettings: (patch: Partial<AlertSettings>) => void;
  toggleType: (type: AlertType) => void;
  setMinSeverity: (s: AlertSeverity) => void;

  // Rule actions
  addRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  updateRule: (id: string, patch: Partial<AlertRule>) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;

  // Reminder actions
  addReminder: (reminder: Omit<AlertReminder, 'id' | 'createdAt' | 'fired' | 'enabled'>) => void;
  removeReminder: (id: string) => void;
  markReminderFired: (id: string) => void;

  // Computed
  getVisibleAlerts: () => CrmAlert[];
  getUnreadCount: () => number;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      alerts: SEED_ALERTS,
      rules: SEED_RULES,
      reminders: SEED_REMINDERS,
      settings: DEFAULT_ALERT_SETTINGS,
      panelOpen: false,
      settingsOpen: false,
      createOpen: false,
      createTab: 'rule' as CreateTab,

      setPanelOpen: (v) => set({ panelOpen: v, settingsOpen: false, createOpen: false }),
      setSettingsOpen: (v) => set({ settingsOpen: v, createOpen: false }),
      setCreateOpen: (v) => set({ createOpen: v, settingsOpen: false }),
      setCreateTab: (tab) => set({ createTab: tab }),

      addAlert: (alert) => {
        const newAlert: CrmAlert = {
          ...alert,
          id: uid('alert'),
          createdAt: new Date().toISOString(),
          read: false,
          dismissed: false,
        };
        // Cap at 50 alerts to prevent unbounded growth from auto-gen
        set((s) => ({ alerts: [newAlert, ...s.alerts].slice(0, 50) }));
      },

      markRead: (id) => set((s) => ({
        alerts: s.alerts.map((a) => a.id === id ? { ...a, read: true } : a),
      })),

      markAllRead: () => set((s) => ({
        alerts: s.alerts.map((a) => ({ ...a, read: true })),
      })),

      dismiss: (id) => set((s) => ({
        alerts: s.alerts.map((a) => a.id === id ? { ...a, dismissed: true } : a),
      })),

      dismissAll: () => set((s) => ({
        alerts: s.alerts.map((a) => ({ ...a, dismissed: true })),
      })),

      removeAlert: (id) => set((s) => ({
        alerts: s.alerts.filter((a) => a.id !== id),
      })),

      updateSettings: (patch) => set((s) => ({
        settings: { ...s.settings, ...patch },
      })),

      toggleType: (type) => set((s) => ({
        settings: {
          ...s.settings,
          enabledTypes: {
            ...s.settings.enabledTypes,
            [type]: !s.settings.enabledTypes[type],
          },
        },
      })),

      setMinSeverity: (severity) => set((s) => ({
        settings: { ...s.settings, minSeverity: severity },
      })),

      // ---- Rule actions ----

      addRule: (rule) => {
        const newRule: AlertRule = {
          ...rule,
          id: uid('rule'),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ rules: [newRule, ...s.rules] }));
      },

      updateRule: (id, patch) => set((s) => ({
        rules: s.rules.map((r) => r.id === id ? { ...r, ...patch } : r),
      })),

      removeRule: (id) => set((s) => ({
        rules: s.rules.filter((r) => r.id !== id),
      })),

      toggleRule: (id) => set((s) => ({
        rules: s.rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r),
      })),

      // ---- Reminder actions ----

      addReminder: (reminder) => {
        const newReminder: AlertReminder = {
          ...reminder,
          id: uid('rem'),
          createdAt: new Date().toISOString(),
          fired: false,
          enabled: true,
        };
        set((s) => ({ reminders: [newReminder, ...s.reminders] }));
      },

      removeReminder: (id) => set((s) => ({
        reminders: s.reminders.filter((r) => r.id !== id),
      })),

      markReminderFired: (id) => set((s) => ({
        reminders: s.reminders.map((r) => {
          if (r.id !== id) return r;
          const now = new Date();

          if (r.recurrence === 'none') {
            return { ...r, fired: true, lastFiredAt: now.toISOString(), enabled: false };
          }

          // Advance scheduledAt for recurring reminders
          const next = new Date(r.scheduledAt);
          switch (r.recurrence) {
            case 'daily': next.setDate(next.getDate() + 1); break;
            case 'weekly': next.setDate(next.getDate() + 7); break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
          }

          return {
            ...r,
            scheduledAt: next.toISOString(),
            lastFiredAt: now.toISOString(),
            fired: false,
          };
        }),
      })),

      // ---- Computed ----

      getVisibleAlerts: () => {
        const { alerts, settings } = get();
        return alerts.filter((a) => {
          if (a.dismissed) return false;
          if (settings.enabledTypes[a.type] === false) return false;
          if (!severityAtOrAbove(a.severity, settings.minSeverity)) return false;
          return true;
        });
      },

      getUnreadCount: () => {
        const visible = get().getVisibleAlerts();
        return visible.filter((a) => !a.read).length;
      },
    }),
    {
      name: 'roadrunner-alerts',
      partialize: (s) => ({
        alerts: s.alerts,
        settings: s.settings,
        rules: s.rules,
        reminders: s.reminders,
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<AlertStore> | undefined;
        // If persisted alerts have grown beyond 50, reset to seed data
        const alerts = (p?.alerts && p.alerts.length <= 50) ? p.alerts : SEED_ALERTS;
        return {
          ...current,
          ...p,
          alerts,
          rules: p?.rules ?? SEED_RULES,
          reminders: p?.reminders ?? SEED_REMINDERS,
        };
      },
    },
  ),
);
