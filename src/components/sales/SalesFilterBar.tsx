'use client';

import { useSalesStore } from '@/stores/sales-store';
import { Plus, Rows, Kanban, SquaresFour, User, Buildings } from '@phosphor-icons/react';
import FavoritesToggle from '@/components/lists/FavoritesToggle';
import { LABELS } from '@/lib/vertical/hr-staffing';

// Stage filters — labels mirror the recruiting pipeline outcome buckets.
const STAGE_FILTERS: { id: 'all' | 'open' | 'won' | 'lost'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'won', label: 'Placed' },
  { id: 'lost', label: 'Not a fit' },
];

const TYPE_FILTERS: { id: 'all' | 'person' | 'company'; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All' },
  { id: 'person', label: 'Candidates', icon: <User size={12} weight="bold" /> },
  { id: 'company', label: 'Clients', icon: <Buildings size={12} weight="bold" /> },
];

export default function SalesFilterBar({ onAddLead }: { onAddLead: () => void }) {
  const stageFilter = useSalesStore((s) => s.stageFilter);
  const setStageFilter = useSalesStore((s) => s.setStageFilter);
  const typeFilter = useSalesStore((s) => s.typeFilter);
  const setTypeFilter = useSalesStore((s) => s.setTypeFilter);
  const view = useSalesStore((s) => s.view);
  const setView = useSalesStore((s) => s.setView);

  return (
    <div data-tour="sales-filter-bar" className="flex items-center gap-3 w-full flex-wrap min-h-[40px]">
      {/* View toggle */}
      <div className="flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
        <button
          onClick={() => setView('list')}
          aria-label="List view"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${view === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          <Rows size={12} weight="bold" /> List
        </button>
        <button
          onClick={() => setView('card')}
          aria-label="Card view"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${view === 'card' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          <SquaresFour size={12} weight="bold" /> Card
        </button>
        <button
          onClick={() => setView('status')}
          aria-label="Status view"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${view === 'status' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          <Kanban size={12} weight="bold" /> Status
        </button>
      </div>

      {/* Lead type filter (People / Company) */}
      <div data-tour="sales-type-filter" className="flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${active ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {f.icon}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Stage filter */}
      <div data-tour="sales-stage-filter" className="flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
        {STAGE_FILTERS.map((f) => {
          const active = stageFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStageFilter(f.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${active ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <FavoritesToggle />
      <button
        data-tour="sales-new-lead"
        onClick={onAddLead}
        className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--brand-primary)] text-white text-[12px] font-bold border-none cursor-pointer hover:opacity-90"
      >
        <Plus size={14} weight="bold" /> {LABELS.newDeal}
      </button>
    </div>
  );
}
