'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CurrentUser {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface UserStore {
  user: CurrentUser;
  isAuthenticated: boolean;
  /**
   * Master toggle for all AI features (AI suggestions widget, duplicate
   * detection, enrichment, record-health card, AI insights bars, etc.).
   * When false, every AI-branded panel is hidden across the app — individual
   * AI sub-toggles under Notifications are AND-ed with this flag.
   */
  aiEnabled: boolean;
  notifications: {
    emailUpdates: boolean;
    staleAlerts: boolean;
    aiSuggestions: boolean;
  };
  /** Sidebar badge visibility — controls which nav items show alert counts */
  sidebarBadges: {
    contacts: boolean;
    sales: boolean;
    recruiting: boolean;
    documents: boolean;
  };
  /** Page insights bar visibility — controls the alert bar at the top of each page */
  insightsBars: {
    dashboard: boolean;
    contacts: boolean;
    sales: boolean;
    recruiting: boolean;
    documents: boolean;
    reporting: boolean;
  };
  defaultView: 'all' | 'org' | 'person';
  /** Row density for data grids across Contacts / Sales / Documents / Recruiting. */
  gridDensity: 'compact' | 'comfortable' | 'spacious';
  /** Alternate-row background striping for data grids. */
  gridZebra: boolean;
  updateUser: (updates: Partial<CurrentUser>) => void;
  setAiEnabled: (enabled: boolean) => void;
  setGridDensity: (density: UserStore['gridDensity']) => void;
  setGridZebra: (enabled: boolean) => void;
  updateNotifications: (updates: Partial<UserStore['notifications']>) => void;
  updateSidebarBadges: (updates: Partial<UserStore['sidebarBadges']>) => void;
  updateInsightsBars: (updates: Partial<UserStore['insightsBars']>) => void;
  setDefaultView: (view: UserStore['defaultView']) => void;
  signIn: (user?: Partial<CurrentUser>) => void;
  signOut: () => void;
}

const DEFAULT_USER: CurrentUser = {
  name: 'Paul Wentzell',
  email: 'paul@navigatorcrm.com',
  role: 'Admin',
  avatarColor: '#1955A6',
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: DEFAULT_USER,
      isAuthenticated: true,
      aiEnabled: true,
      notifications: {
        emailUpdates: true,
        staleAlerts: true,
        aiSuggestions: true,
      },
      sidebarBadges: {
        contacts: true,
        sales: true,
        recruiting: true,
        documents: false,
      },
      insightsBars: {
        dashboard: true,
        contacts: true,
        sales: true,
        recruiting: true,
        documents: true,
        reporting: true,
      },
      defaultView: 'all',
      gridDensity: 'comfortable',
      gridZebra: false,
      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      setGridDensity: (density) => set({ gridDensity: density }),
      setGridZebra: (enabled) => set({ gridZebra: enabled }),
      updateNotifications: (updates) => set((s) => ({ notifications: { ...s.notifications, ...updates } })),
      updateSidebarBadges: (updates) => set((s) => ({ sidebarBadges: { ...s.sidebarBadges, ...updates } })),
      updateInsightsBars: (updates) => set((s) => ({ insightsBars: { ...s.insightsBars, ...updates } })),
      setDefaultView: (view) => set({ defaultView: view }),
      signIn: (userUpdates) =>
        set((s) => ({
          isAuthenticated: true,
          user: userUpdates ? { ...s.user, ...userUpdates } : s.user,
        })),
      signOut: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'navigator-crm-user',
      merge: (persisted, current) => {
        const state = { ...(current as UserStore), ...(persisted as Partial<UserStore>) };
        // Backfill new fields that don't exist in old persisted data
        if (!state.sidebarBadges) {
          state.sidebarBadges = { contacts: true, sales: true, recruiting: true, documents: false };
        }
        if (!state.insightsBars) {
          state.insightsBars = { dashboard: true, contacts: true, sales: true, recruiting: true, documents: true, reporting: true };
        }
        if (typeof state.aiEnabled !== 'boolean') {
          state.aiEnabled = true;
        }
        if (!state.gridDensity || !['compact', 'comfortable', 'spacious'].includes(state.gridDensity)) {
          state.gridDensity = 'comfortable';
        }
        if (typeof state.gridZebra !== 'boolean') {
          state.gridZebra = false;
        }
        return state;
      },
    }
  )
);
