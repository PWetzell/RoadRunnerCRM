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

  return (
    <>
      <Topbar title="Contacts">
        <ContactSearchBar />
      </Topbar>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
          {aiEnabled && insightsBars?.contacts && <AIInsightsBar />}
          <ContactFilterBar onAddContact={() => setChooserOpen(true)} />
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
