'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import DataGrid from '@/components/contacts/DataGrid';
import ContactsCardView from '@/components/contacts/ContactsCardView';
import ContactFilterBar from '@/components/contacts/ContactFilterBar';
import AIInsightsBar from '@/components/contacts/AIInsightsBar';
import ContactSearchBar from '@/components/contacts/ContactSearchBar';
import SlidePanel from '@/components/ui/SlidePanel';
import ListFilterChip from '@/components/lists/ListFilterChip';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { Users, Buildings } from '@phosphor-icons/react';

export default function ContactsPage() {
  const router = useRouter();
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const view = useContactStore((s) => s.view);
  const [newContactType, setNewContactType] = useState<'person' | 'company' | null>(null);

  return (
    <>
      <Topbar title="Contacts">
        <ContactSearchBar />
      </Topbar>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
          {aiEnabled && insightsBars?.contacts && <AIInsightsBar />}
          <ContactFilterBar onAddContact={() => setNewContactType('person')} />
          <div className="w-full">
            <ListFilterChip />
          </div>
        </div>
        <div data-tour="contacts-grid" className="flex-1 overflow-hidden px-5 pb-5">
          {view === 'list' ? <DataGrid /> : <ContactsCardView />}
        </div>
      </div>

      <SlidePanel
        open={newContactType === 'person'}
        onClose={() => setNewContactType(null)}
        title="New Person"
        width={620}
      >
        <div className="p-5">
          {/* Quick type switcher */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setNewContactType('person')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-bold border cursor-pointer transition-all ${
                newContactType === 'person'
                  ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
              }`}
            >
              <Users size={16} weight="duotone" /> Person
            </button>
            <button
              onClick={() => setNewContactType('company')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-bold border cursor-pointer transition-all ${
                newContactType === 'company'
                  ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
              }`}
            >
              <Buildings size={16} weight="duotone" /> Company
            </button>
          </div>
          {/* Embed the appropriate new-contact form */}
          <div className="text-[12px] text-[var(--text-tertiary)] text-center py-8">
            <a href={`/contacts/new/${newContactType}`} className="text-[var(--brand-primary)] font-bold no-underline hover:underline">
              Open full {newContactType === 'company' ? 'company' : 'person'} form →
            </a>
          </div>
        </div>
      </SlidePanel>

      <SlidePanel
        open={newContactType === 'company'}
        onClose={() => setNewContactType(null)}
        title="New Company"
        width={620}
      >
        <div className="p-5">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setNewContactType('person')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-bold border cursor-pointer transition-all ${
                newContactType === 'person'
                  ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
              }`}
            >
              <Users size={16} weight="duotone" /> Person
            </button>
            <button
              onClick={() => setNewContactType('company')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-bold border cursor-pointer transition-all ${
                newContactType === 'company'
                  ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)]'
              }`}
            >
              <Buildings size={16} weight="duotone" /> Company
            </button>
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)] text-center py-8">
            <a href={`/contacts/new/${newContactType}`} className="text-[var(--brand-primary)] font-bold no-underline hover:underline">
              Open full {newContactType === 'company' ? 'company' : 'person'} form →
            </a>
          </div>
        </div>
      </SlidePanel>
    </>
  );
}
