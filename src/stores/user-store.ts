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
      isAuthenticated: false,
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
      /**
       * Full sign-out: flips the auth flag, wipes the cached identity, and
       * clears the `roadrunner_visited` flag so AuthGate renders its
       * first-visit experience (prominent "Continue with Google" CTA with
       * the Gmail-import promise) on the next render.
       *
       * Why we don't keep the previous identity around for a "Welcome
       * back" pre-fill: the user is *also* commonly using sign-out as a
       * way to disconnect from the previous session entirely (e.g. they
       * already disconnected Gmail in Settings and now want to start
       * fresh). Pre-filling the form with `paul@navigatorcrm.com` (the
       * demo seed) or the previous Google email made the welcome-back
       * screen feel like the wrong UI for that path — Gmail-connect was
       * buried behind a small "Sign in with Google" link instead of being
       * the headline action. Industry pattern (Linear / Attio): sign-out
       * resets to the unauthenticated marketing/import-focused screen,
       * not a partially-remembered profile.
       *
       * Note: this does NOT call `supabase.auth.signOut()` itself — the
       * caller (Topbar) is responsible for killing the Supabase session
       * cookie before invoking this, otherwise AuthGate's `getUser()`
       * listener will auto-rehydrate the session on the next render.
       */
      signOut: () => {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('roadrunner_visited');
            // Also clear the Gmail-banner "Ignore" dismissal so the next
            // signed-in session sees the connect prompt again. Without
            // this, a user who clicked Ignore in a previous session, then
            // signed out and signed back in (or created a brand-new
            // account on the same browser), would never see the banner —
            // even though for the new identity it's the most relevant
            // CTA on the page. Bit Paul on 2026-04-27 when a fresh signup
            // landed on /contacts with no Gmail-connect prompt because a
            // long-ago "Ignore" click was still cached.
            localStorage.removeItem('roadrunner.gmailBanner.dismissed');
          }
        } catch {
          // localStorage blocked — harmless, AuthGate falls back to
          // first-visit mode by default when the flag is absent.
        }
        set({
          isAuthenticated: false,
          user: { name: '', email: '', role: 'Admin', avatarColor: '#1955A6' },
        });
      },
    }),
    {
      name: 'navigator-crm-user',
      // Persist auth state along with preferences so a browser refresh
      // doesn't kick the user back to the login screen. Paul reported on
      // 2026-04-28 that hitting refresh dumped him to the login page —
      // root cause was that `isAuthenticated` was explicitly stripped
      // here. Industry CRMs (HubSpot, Salesforce, Pipedrive) all keep
      // the user signed in across refresh.
      partialize: (state) => state,
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
