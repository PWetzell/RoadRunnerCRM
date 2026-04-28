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
 * Reactive total unread count, scoped to contacts that are ACTUALLY in
 * the user's contact store. Used for the column-header badge on the
 * contacts grid — lets the user see global inbox pressure at a glance,
 * same pattern as Gmail's left-rail "Inbox · 12".
 *
 * Bug Paul caught on 2026-04-27: the previous version iterated every
 * seed-unread id regardless of whether the contact existed in the
 * store, so a real user with 3 Gmail-imported contacts saw "60 unread"
 * — leaking demo data into a real-account view. Now we intersect with
 * the live contact-store ids before counting, so the badge reflects
 * only the contacts on screen.
 */
export function useTotalUnreadCount(): number {
  const overrides = useReadOverridesSet();
  const contacts = useContactStore((s) => s.contacts);
  return useMemo(() => {
    const liveIds = new Set(contacts.map((c) => c.id));
    let total = 0;
    // Seed-derived unread (demo contacts).
    for (const [contactId, ids] of getSeedUnreadIdsMap().entries()) {
      if (!liveIds.has(contactId)) continue;
      for (const id of ids) if (!overrides.has(id)) total++;
    }
    // Live unread count from /api/contacts (real Gmail-synced contacts).
    // Adds to the seed-derived count above so a workspace with both
    // demo + real data gets a unified total in the column-header
    // badge.
    for (const c of contacts) {
      const live = c.recentEmail?.unreadCount;
      if (typeof live === 'number') total += live;
    }
    return total;
  }, [overrides, contacts]);
}
