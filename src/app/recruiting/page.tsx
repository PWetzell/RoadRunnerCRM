'use client';

import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import RecruitingKanban from '@/components/recruiting/RecruitingKanban';
import RecruitingList from '@/components/recruiting/RecruitingList';
import DataGrid from '@/components/contacts/DataGrid';
import RecruitingCardView from '@/components/recruiting/RecruitingCardView';
import RecruitingInsightsBar from '@/components/recruiting/RecruitingInsightsBar';
import RecruitingFilterBar from '@/components/recruiting/RecruitingFilterBar';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useUserStore } from '@/stores/user-store';

export default function RecruitingPage() {
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const [view, setView] = useState<'list' | 'card' | 'kanban'>('list');
  const [search, setSearch] = useState('');

  return (
    <>
      <Topbar title="Recruiting">
        <div className="flex-1 max-w-xs ml-5 relative">
          <MagnifyingGlass size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="w-full h-[34px] pl-9 pr-3 border border-[var(--border)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-primary)] bg-[var(--surface-raised)] outline-none transition-all focus:border-[var(--brand-primary)] focus:bg-[var(--surface-card)] focus:shadow-[0_0_0_3px_var(--brand-bg)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </Topbar>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-5 pt-3 pb-1 flex flex-col gap-1.5 items-start">
          {aiEnabled && insightsBars?.recruiting && <RecruitingInsightsBar />}
          <RecruitingFilterBar view={view} setView={setView} />

        </div>
        <div data-tour="recruiting-pipeline" className="flex-1 overflow-hidden px-5 pb-5">
          {view === 'list' ? <RecruitingList search={search} /> : view === 'card' ? <RecruitingCardView search={search} /> : <RecruitingKanban />}
        </div>
      </div>
    </>
  );
}
