'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { DealStage } from '@/types/deal';
import SalesDetailHeader from '@/components/sales/detail/SalesDetailHeader';
import SalesDetailTabs, { SalesTabId } from '@/components/sales/detail/SalesDetailTabs';
import SalesOverviewTab from '@/components/sales/detail/SalesOverviewTab';
import SalesDetailsTab from '@/components/sales/detail/SalesDetailsTab';
import SalesQualifyTab from '@/components/sales/detail/SalesQualifyTab';
import DocumentsTab from '@/components/detail/DocumentsTab';
import ConvertToCustomerDialog from '@/components/sales/ConvertToCustomerDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getLeadCompleteness } from '@/lib/leadCompleteness';
import Link from 'next/link';

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const deal = useSalesStore((s) => s.getDeal(id));
  const updateDeal = useSalesStore((s) => s.updateDeal);
  const deleteDeal = useSalesStore((s) => s.deleteDeal);
  const convertToCustomer = useSalesStore((s) => s.convertToCustomer);
  const contacts = useContactStore((s) => s.contacts);

  const [activeTab, setActiveTab] = useState<SalesTabId>('overview');
  const [showConvert, setShowConvert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const person = useMemo(() => contacts.find((c) => c.id === deal?.personContactId), [contacts, deal?.personContactId]);
  const org = useMemo(() => contacts.find((c) => c.id === deal?.orgContactId), [contacts, deal?.orgContactId]);

  const completeness = useMemo(() => {
    if (!deal) return { pct: 0, filled: 0, total: 0, fields: [], missing: [] };
    return getLeadCompleteness(deal, person, org);
  }, [deal, person, org]);

  if (!deal) {
    return (
      <>
        <Topbar title="Deal not found" />
        <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)]">
          <div className="text-center">
            <div className="text-[14px] font-semibold mb-2">This deal doesn&apos;t exist or was deleted.</div>
            <Link href="/sales" className="text-[12px] text-[var(--brand-primary)] no-underline hover:underline">← Back to Sales</Link>
          </div>
        </div>
      </>
    );
  }

  function handleStageChange(s: DealStage) {
    updateDeal(deal!.id, { stage: s, ...(s === 'closed-lost' ? { closedAt: new Date().toISOString().split('T')[0] } : {}) });
    setToast(`Stage moved to ${s.replace('-', ' ')}`);
    setTimeout(() => setToast(null), 2000);
  }

  function handleConvert() {
    const result = convertToCustomer(deal!.id);
    setShowConvert(false);
    if (result.ok) {
      setToast(`🎉 ${result.orgName} is now a customer`);
      setTimeout(() => router.push('/sales'), 1400);
    }
  }

  return (
    <>
      <Topbar title="" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <SalesDetailHeader
          deal={deal}
          person={person}
          org={org}
          completeness={completeness}
          onBack={() => router.push('/sales')}
          onDelete={() => setConfirmDelete(true)}
        />
        <SalesDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto p-5" style={{ minHeight: 0 }}>
          {activeTab === 'overview' && <SalesOverviewTab deal={deal} person={person} org={org} />}
          {activeTab === 'details' && <SalesDetailsTab deal={deal} person={person} org={org} completeness={completeness} />}
          {activeTab === 'qualify' && <SalesQualifyTab deal={deal} person={person} org={org} completeness={completeness} onStageChange={handleStageChange} />}
          {activeTab === 'documents' && <DocumentsTab dealId={deal.id} contactId={deal.orgContactId || deal.personContactId} />}
        </div>
        {deal.stage === 'negotiation' && (
          <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-card)] flex justify-end">
            <button
              onClick={() => setShowConvert(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[var(--success)] border-none rounded-md cursor-pointer hover:opacity-90"
            >
              Convert to Customer
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-[var(--surface-card)] px-4 py-2.5 rounded-md text-[13px] font-semibold shadow-xl z-[200]">
          {toast}
        </div>
      )}

      {showConvert && (
        <ConvertToCustomerDialog deal={deal} org={org} onCancel={() => setShowConvert(false)} onConfirm={handleConvert} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete deal?"
        message="This cannot be undone. The linked contacts will not be affected."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => { deleteDeal(deal.id); router.push('/sales'); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
