'use client';

import { create } from 'zustand';

/**
 * Shape returned by `/api/gmail/status`. Mirrors the API contract so
 * consumers can read it without re-typing.
 */
export interface GmailStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string | null;
  connectedAt?: string | null;
  messageCount?: number;
  reason?: string;
}

interface GmailStatusStore {
  status: GmailStatus | null;
  /** True while a refresh() call is in flight. */
  loading: boolean;
  /**
   * Fetch the latest status from the server and broadcast to every
   * subscribed component. Idempotent: concurrent calls don't double-fire.
   */
  refresh: () => Promise<void>;
  /**
   * Apply an immediate status update without hitting the network — used by
   * components that just performed a disconnect/connect and want to flip
   * every subscriber's UI before the server round-trip completes. Call
   * `refresh()` afterwards to reconcile with the server.
   */
  setOptimistic: (next: GmailStatus) => void;
}

/**
 * Single source of truth for Gmail connection state across the app.
 *
 * Why this exists: the Dashboard's GmailSyncBanner and the Settings
 * GmailIntegrationSection were each holding their own `useState` copy and
 * fetching `/api/gmail/status` independently. When the user disconnected
 * via Settings, Settings flipped to "Not connected" but the Banner kept
 * its stale "connected as <email>" cache until a full page reload — two
 * UIs disagreeing about the same fact.
 *
 * Pulling the status into a Zustand store fixes that one bug AND
 * pre-emptively fixes any future surface that wants to know whether
 * Gmail is connected (e.g. the import wizard could read this directly
 * instead of doing its own fetch).
 *
 * Industry pattern: HubSpot/Linear/Notion all keep integration-status in
 * a shared client cache (React Query or equivalent) so multiple surfaces
 * stay aligned. We don't have React Query here, so a thin Zustand store
 * is the equivalent shape.
 */
export const useGmailStatusStore = create<GmailStatusStore>((set, get) => ({
  status: null,
  loading: false,

  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const r = await fetch('/api/gmail/status');
      const body = (await r.json()) as GmailStatus;
      set({ status: body, loading: false });
    } catch {
      set({ status: { connected: false, reason: 'error' }, loading: false });
    }
  },

  setOptimistic: (next) => set({ status: next }),
}));
