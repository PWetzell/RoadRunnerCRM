'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import SalesDataGrid from '@/components/sales/SalesDataGrid';
import SalesCardView from '@/components/sales/SalesCardView';
import SalesKanban from '@/components/sales/SalesKanban';
import SalesFilterBar from '@/components/sales/SalesFilterBar';
import SalesInsightsBar from '@/components/sales/SalesInsightsBar';
import SalesSearchBar from '@/components/sales/SalesSearchBar';
import SlidePanel from '@/components/ui/SlidePanel';
import ListFilterChip from '@/components/lists/ListFilterChip';
import { useSalesStore } from '@/stores/sales-store';
import { useUserStore } from '@/stores/user-store';
import { LABELS } from '@/lib/vertical/hr-staffing';

// Lazy-load the new lead form content
import dynamic from 'next/dynamic';
const NewLeadContent = dynamic(() => import('./new/page'), { ssr: false });

export default function SalesPage() {
  const router = useRouter();
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const view = useSalesStore((s) => s.view);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  return (
    <>
      <Topbar title={LABELS.pageSalesTitle}><SalesSearchBar /></Topbar>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
          {aiEnabled && insightsBars?.sales && <SalesInsightsBar />}
          <SalesFilterBar onAddLead={() => setNewLeadOpen(true)} />
          <div className="w-full">
            <ListFilterChip />
          </div>
        </div>
        <div data-tour="sales-grid" className="flex-1 overflow-hidden px-5 pb-5">
          {view === 'list' ? <SalesDataGrid /> : view === 'card' ? <SalesCardView /> : <SalesKanban />}
        </div>
      </div>

      <SlidePanel
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        title={LABELS.newDeal}
        width={620}
      >
        <NewLeadContent />
      </SlidePanel>
    </>
  );
}
