'use client';

import { useMemo } from 'react';
import { useContactStore } from '@/stores/contact-store';
import {
  getUnreadCountForContact,
  getSeedUnreadIdsMap,
} from '@/lib/data/seed-emails';

/**
 * Reactive unread-email helpers for the contacts grid + Emails tab.
 *
 * Why this exists:
 *   The seed emails have a static `readAt: null` flag baked in at module
 *   load. Without a reactive override, reading an email in EmailsPanel only
 *   mutates local React state — so the tab-trigger badge and the
 *   contacts-grid unread chips never clear, and leaving/returning to the
 *   contact re-surfaces every "read" email as unread again (Paul reported
 *   both of these verbatim).
 *
 *   The override set lives in `useContactStore` so it's a single source of
 *   truth that persists across reloads, matching the Gmail/Outlook "once
 *   read, stays read" expectation that every industry CRM (HubSpot, Folk,
 *   Attio) inherits from its mail-client ancestors.
 */

/** Memoized `Set<string>` view of the store's read-override array. */
export function useReadOverridesSet(): ReadonlySet<string> {
  const overrides = useContactStore((s) => s.emailReadOverrides);
  return useMemo(() => new Set(overrides), [overrides]);
}

/** Reactive unread count for a single contact. */
export function useUnreadCountForContact(contactId: string): number {
  const overrides = useReadOverridesSet();
  return getUnreadCountForContact(contactId, overrides);
}

/**
 * Reactive total unread count across every contact in the seed. Used for
 * the column-header badge on the contacts grid — lets the user see the
 * global inbox pressure at a glance, same pattern as Gmail's left-rail
 * "Inbox · 12" label.
 */
export function useTotalUnreadCount(): number {
  const overrides = useReadOverridesSet();
  return useMemo(() => {
    let total = 0;
    for (const ids of getSeedUnreadIdsMap().values()) {
      for (const id of ids) if (!overrides.has(id)) total++;
    }
    return total;
  }, [overrides]);
}
