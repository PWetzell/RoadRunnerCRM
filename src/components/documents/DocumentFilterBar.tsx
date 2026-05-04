'use client';

import { Rows, SquaresFour, Plus } from '@phosphor-icons/react';
import { useDocumentStore, DocView } from '@/stores/document-store';
import { DOCUMENT_CATEGORIES, DocumentCategory } from '@/types/document';
import FavoritesToggle from '@/components/lists/FavoritesToggle';

interface Props {
  onUpload: () => void;
}

export default function DocumentFilterBar({ onUpload }: Props) {
  const view = useDocumentStore((s) => s.view);
  const setView = useDocumentStore((s) => s.setView);
  const categoryFilter = useDocumentStore((s) => s.categoryFilter);
  const setCategoryFilter = useDocumentStore((s) => s.setCategoryFilter);

  return (
    <div data-tour="documents-filter-bar" className="flex items-center gap-3 w-full flex-wrap min-h-[40px]">
      {/* View toggle */}
      <div className="flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
        <ViewBtn active={view === 'grid'} onClick={() => setView('grid')} label="List">
          <Rows size={12} weight="bold" /> List
        </ViewBtn>
        <ViewBtn active={view === 'card'} onClick={() => setView('card')} label="Card">
          <SquaresFour size={12} weight="bold" /> Card
        </ViewBtn>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-1">
        <FilterBtn active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
          All
        </FilterBtn>
        {DOCUMENT_CATEGORIES.slice(0, 7).map((c) => (
          <FilterBtn key={c.id} active={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)}>
            {c.label}
          </FilterBtn>
        ))}
      </div>

      <FavoritesToggle />

      {/* Upload — matches contacts "New Contact" button sizing */}
      <button
        data-tour="documents-upload"
        onClick={onUpload}
        className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold border-none cursor-pointer hover:opacity-90"
      >
        <Plus size={11} weight="bold" /> Upload Document
      </button>
    </div>
  );
}

function ViewBtn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${
        active ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border-none transition-colors ${
        active ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}
