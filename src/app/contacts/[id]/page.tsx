'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { detailDensityStyle } from '@/lib/grid-density';
import Topbar from '@/components/layout/Topbar';
import DetailHeader from '@/components/detail/DetailHeader';
import DetailTabs from '@/components/detail/DetailTabs';
import OverviewTab from '@/components/detail/OverviewTab';
import DetailsTab from '@/components/detail/DetailsTab';
import OrgChartTab from '@/components/detail/OrgChartTab';
import DocumentsTab from '@/components/detail/DocumentsTab';

type TabId = 'overview' | 'details' | 'orgchart' | 'documents';

const TAB_IDS: TabId[] = ['overview', 'details', 'orgchart', 'documents'];

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const contact = useContactStore((s) => s.getContact(id));
  const gridDensity = useUserStore((s) => s.gridDensity);

  // Deep-link support: ?tab=documents&docId=doc-123 lets callers (e.g. the
  // Location link in DocumentPreviewPanel) land users on a specific tab
  // with a specific document's preview already open. We seed state from
  // the URL once on mount, then strip the query so a manual tab switch
  // later doesn't fight the URL.
  const urlTab = searchParams.get('tab');
  const urlDocId = searchParams.get('docId');
  const initialTab: TabId = TAB_IDS.includes(urlTab as TabId) ? (urlTab as TabId) : 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [scrollToCardId, setScrollToCardId] = useState<string | null>(null);
  const [initialDocId, setInitialDocId] = useState<string | null>(urlDocId);

  // Strip the deep-link params once consumed so a refresh doesn't re-open
  // the preview and so manual tab switches don't get overridden.
  useEffect(() => {
    if (urlTab || urlDocId) {
      router.replace(`/contacts/${id}`, { scroll: false });
    }
    // Only runs on mount; intentional single-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!contact) {
    return (
      <>
        <Topbar title="Contact Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--text-secondary)]">Contact not found</p>
            <button
              onClick={() => router.push('/contacts')}
              className="mt-4 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-[var(--radius-sm)] text-sm font-bold"
            >
              Back to Contacts
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="" />
      <div className="flex-1 flex flex-col overflow-hidden" style={detailDensityStyle(gridDensity)} data-detail-density={gridDensity}>
        <DetailHeader contact={contact} onBack={() => router.push('/contacts')} />
        <DetailTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, paddingLeft: 'var(--detail-px)', paddingRight: 'var(--detail-px)', paddingTop: 'var(--detail-py)', paddingBottom: 'var(--detail-py)' }}>
          {activeTab === 'overview' && (
            <OverviewTab
              contact={contact}
              onNavigateToDetails={(cardId) => {
                setActiveTab('details');
                if (cardId) setScrollToCardId(cardId);
              }}
            />
          )}
          {activeTab === 'details' && (
            <DetailsTab
              contact={contact}
              scrollToCardId={scrollToCardId}
              onScrolled={() => setScrollToCardId(null)}
            />
          )}
          {activeTab === 'orgchart' && <OrgChartTab contact={contact} />}
          {activeTab === 'documents' && (
            <DocumentsTab
              contactId={contact.id}
              initialPreviewId={initialDocId ?? undefined}
              onInitialPreviewConsumed={() => setInitialDocId(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
