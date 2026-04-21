'use client';

import { Plus, Rows, SquaresFour } from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';
import { useContactStore } from '@/stores/contact-store';
import FavoritesToggle from '@/components/lists/FavoritesToggle';

interface ContactFilterBarProps {
  onAddContact?: () => void;
}

export default function ContactFilterBar({ onAddContact }: ContactFilterBarProps) {
  const filter = useContactStore((s) => s.filter);
  const setFilter = useContactStore((s) => s.setFilter);
  const view = useContactStore((s) => s.view);
  const setView = useContactStore((s) => s.setView);

  // When a list filter is active (via ?list=), the entity-type + starred
  // pills become secondary filters layered on top of the list. Dim them so
  // the user sees the list banner as the dominant filter in play.
  const searchParams = useSearchParams();
  const listFilterActive = !!searchParams.get('list');

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'org' as const, label: 'Organizations' },
    { key: 'person' as const, label: 'People' },
  ];

  return (
    <div data-tour="contacts-filter-bar" className="flex items-center gap-3 w-full flex-wrap min-h-[40px]">
      {/* View toggle (List | Card) */}
      <div className="flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
        <button
          onClick={() => setView('list')}
          aria-label="List view"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer border-none transition-colors ${view === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          <Rows size={12} weight="bold" /> List
        </button>
        <button
          onClick={() => setView('card')}
          aria-label="Card view"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold cursor-pointer border-none transition-colors ${view === 'card' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          <SquaresFour size={12} weight="bold" /> Card
        </button>
      </div>

      {/* Type filter (All | Organizations | People) — dimmed when a list filter is active */}
      <div
        className={`flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1 transition-opacity ${listFilterActive ? 'opacity-60' : ''}`}
        title={listFilterActive ? 'List filter is active — type filter narrows within the list' : undefined}
      >
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer border-none transition-colors ${active ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={`transition-opacity ${listFilterActive ? 'opacity-60' : ''}`}>
        <FavoritesToggle />
      </div>

      {/* New Contact */}
      {onAddContact && (
        <button
          onClick={onAddContact}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--brand-primary)] text-white text-[12px] font-bold border-none cursor-pointer hover:opacity-90"
        >
          <Plus size={14} weight="bold" /> New Contact
        </button>
      )}
    </div>
  );
}
