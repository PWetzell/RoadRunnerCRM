'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useContactStore } from '@/stores/contact-store';
import Topbar from '@/components/layout/Topbar';
import DetailHeader from '@/components/detail/DetailHeader';
import DetailTabs from '@/components/detail/DetailTabs';
import OverviewTab from '@/components/detail/OverviewTab';
import DetailsTab from '@/components/detail/DetailsTab';
import OrgChartTab from '@/components/detail/OrgChartTab';
import DocumentsTab from '@/components/detail/DocumentsTab';

type TabId = 'overview' | 'details' | 'orgchart' | 'documents';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const contact = useContactStore((s) => s.getContact(id));
  const [activeTab, setActiveTab] = useState<TabId>('overview');

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
      <div className="flex-1 flex flex-col overflow-hidden">
        <DetailHeader contact={contact} onBack={() => router.push('/contacts')} />
        <DetailTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto p-5" style={{ minHeight: 0 }}>
          {activeTab === 'overview' && <OverviewTab contact={contact} />}
          {activeTab === 'details' && <DetailsTab contact={contact} />}
          {activeTab === 'orgchart' && <OrgChartTab contact={contact} />}
          {activeTab === 'documents' && <DocumentsTab contactId={contact.id} />}
        </div>
      </div>
    </>
  );
}
