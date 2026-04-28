'use client';

import { useState } from 'react';
import { Rows, Kanban, SquaresFour, Funnel } from '@phosphor-icons/react';
import { RECRUITING_STAGES, RecruitingStage } from '@/types/recruiting';
import FavoritesToggle from '@/components/lists/FavoritesToggle';

interface Props {
  view: 'list' | 'card' | 'kanban';
  setView: (v: 'list' | 'card' | 'kanban') => void;
}

export default function RecruitingFilterBar({ view, setView }: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [stageFilter, setStageFilter] = useState<RecruitingStage | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const activeFilterCount = [stageFilter !== 'all', !!dateFrom, !!dateTo, !!sourceFilter].filter(Boolean).length;

  return (
    <>
      <div className="flex items-center gap-3 w-full flex-wrap min-h-[40px]">
        {/* View toggle */}
        <div data-tour="recruiting-view-toggle" className="flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
          <button onClick={() => setView('list')} aria-label="List view"
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${view === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <Rows size={12} weight="bold" /> List
          </button>
          <button onClick={() => setView('card')} aria-label="Card view"
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${view === 'card' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <SquaresFour size={12} weight="bold" /> Card
          </button>
          <button onClick={() => setView('kanban')} aria-label="Pipeline view"
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${view === 'kanban' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <Kanban size={12} weight="bold" /> Pipeline
          </button>
        </div>

        {/* Single Filters button */}
        <button data-tour="recruiting-filters" onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border cursor-pointer transition-all ${
            showFilters || activeFilterCount > 0
              ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border)] hover:border-[var(--brand-primary)]'
          }`}>
          <Funnel size={14} weight="bold" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        <FavoritesToggle />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap w-full pb-1">
          {/* Stage */}
          <div className="inline-flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-0.5">
            <button onClick={() => setStageFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors ${stageFilter === 'all' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}>All</button>
            {RECRUITING_STAGES.filter((s) => s.id !== 'rejected').map((s) => (
              <button key={s.id} onClick={() => setStageFilter(s.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors ${stageFilter === s.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
            <span>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
          </div>

          {/* Source */}
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
            <option value="">All sources</option>
            <option value="Inbound">Inbound</option>
            <option value="Outbound">Outbound</option>
            <option value="Referral">Referral</option>
            <option value="Event">Event</option>
            <option value="Partner">Partner</option>
            <option value="Marketing">Marketing</option>
          </select>

          {activeFilterCount > 0 && (
            <button onClick={() => { setStageFilter('all'); setDateFrom(''); setDateTo(''); setSourceFilter(''); }}
              className="text-[11px] font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer hover:underline">
              Clear all
            </button>
          )}
        </div>
      )}
    </>
  );
}
