'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import DataGrid from '@/components/contacts/DataGrid';
import ContactsCardView from '@/components/contacts/ContactsCardView';
import ContactFilterBar from '@/components/contacts/ContactFilterBar';
import AIInsightsBar from '@/components/contacts/AIInsightsBar';
import ContactSearchBar from '@/components/contacts/ContactSearchBar';
import SlidePanel from '@/components/ui/SlidePanel';
import ListFilterChip from '@/components/lists/ListFilterChip';
import { ContactTypeChooser } from '@/components/contact-flow/ContactTypeChooser';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { useGmailStatusStore } from '@/stores/gmail-status-store';
import type { ContactWithEntries } from '@/types/contact';

export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const view = useContactStore((s) => s.view);
  // Single-flag state now: the slide panel shows the chooser. Selecting
  // Person/Company/resume-upload navigates to the dedicated full-page flow.
  const [chooserOpen, setChooserOpen] = useState(false);

  // Auto-open the chooser panel when the page loads with `?add=1`. Used by
  // the breadcrumbs inside /contacts/new/person and /contacts/new/company:
  // clicking "Add Person" / "Add Company" routes back here and opens the
  // slide panel instead of the deprecated /contacts/new full page.
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setChooserOpen(true);
      // Strip the query param so a refresh doesn't re-open the panel.
      router.replace('/contacts', { scroll: false });
    }
  }, [searchParams, router]);

  // Refresh per-contact email-activity summary (`recentEmail`) whenever
  // a Gmail sync completes. Without this, the contacts grid's "New" pill
  // and unread/attachment counts stay stuck at whatever AuthGate hydrated
  // at sign-in — clicking "Sync now" pulls fresh email_messages rows
  // server-side, but the grid keeps rendering stale activity flags
  // because /api/contacts is never re-called after the initial load.
  // Bug Paul caught on 2026-04-27 ("why isn't the new email status
  // showing in contacts").
  //
  // We overlay ONLY the `recentEmail` field per contact rather than
  // replacing the whole record — preserves any local edits (entries,
  // hiddenCards, dismissedSuggestions) the same way AuthGate's merge
  // does.
  const lastSyncAt = useGmailStatusStore((s) => s.status?.lastSyncAt);
  useEffect(() => {
    if (!lastSyncAt) return;
    let cancelled = false;
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body || !Array.isArray(body.contacts)) return;
        type RecentEmail = NonNullable<ContactWithEntries['recentEmail']>;
        const updates = new Map<string, RecentEmail>();
        for (const c of body.contacts as Array<{ id: string; recentEmail?: RecentEmail }>) {
          if (c.recentEmail) updates.set(c.id, c.recentEmail);
        }
        useContactStore.setState((s) => ({
          contacts: s.contacts.map((c) =>
            updates.has(c.id) ? { ...c, recentEmail: updates.get(c.id) } : c,
          ),
        }));
      })
      .catch(() => { /* silent — stale data is fine, errors logged in API */ });
    return () => { cancelled = true; };
  }, [lastSyncAt]);

  return (
    <>
      <Topbar title="Contacts">
        <ContactSearchBar />
      </Topbar>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
          {/* SuggestionsCallout (the standalone "N senders ready to become
              contacts" banner) was removed in favor of folding the count
              directly into the global GmailSyncBanner's "Import contacts"
              CTA — Folk/Attio pattern: one banner, one place, count
              becomes the action label when > 0. */}
          {aiEnabled && insightsBars?.contacts && <AIInsightsBar />}
          <div className="w-full flex items-start justify-between gap-3 flex-wrap">
            <ContactFilterBar onAddContact={() => setChooserOpen(true)} />
            {/* Bulk Email entry point moved to the Manage Emails > Bulk
                sidebar route (/bulk). Keeping the recipient picker on the
                Bulk page itself follows HubSpot's `Marketing > Email`
                pattern: one composer hub, reachable from the dedicated
                nav item rather than living on the contacts list. */}
          </div>
          <div className="w-full">
            <ListFilterChip />
          </div>
        </div>
        <div data-tour="contacts-grid" className="flex-1 overflow-hidden px-5 pb-5">
          {view === 'list' ? <DataGrid /> : <ContactsCardView />}
        </div>
      </div>

      <SlidePanel
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        title="Add New Contact"
        width={640}
      >
        <div className="p-6">
          <ContactTypeChooser onCancel={() => setChooserOpen(false)} />
        </div>
      </SlidePanel>
    </>
  );
}
