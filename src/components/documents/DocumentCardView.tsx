'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Funnel } from '@phosphor-icons/react';
import SavedCardViewBar from '@/components/ui/SavedCardViewBar';
import { useDocumentStore } from '@/stores/document-store';
import { useListStore } from '@/stores/list-store';
import { CrmDocument } from '@/types/document';
import DocumentCard from './DocumentCard';

interface Props {
  documents?: CrmDocument[];
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Card/thumbnail grid for documents. Responsive CSS grid — adapts to
 * available width. Each card shows a visual preview (image thumbnail,
 * file-type icon, or PDF placeholder) with name + meta below.
 */
type DocCardSort = 'uploadedAt' | 'name' | 'size' | 'category' | 'uploadedBy';
type DocCategoryFilter = 'all' | 'contract' | 'proposal' | 'invoice' | 'report' | 'presentation' | 'image' | 'correspondence' | 'legal' | 'other';

export default function DocumentCardView({ documents: externalDocs, onPreview, onRemove }: Props) {
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const memberships = useListStore((s) => s.memberships);
  const [cardSort, setCardSort] = useState<DocCardSort>('uploadedAt');
  const [showDocFilters, setShowDocFilters] = useState(false);
  const [catFilter, setCatFilter] = useState<DocCategoryFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [uploadedByFilter, setUploadedByFilter] = useState('');

  const activeDocFilterCount = [catFilter !== 'all', !!dateFrom, !!dateTo, !!uploadedByFilter, cardSort !== 'uploadedAt'].filter(Boolean).length;
  // Pull raw state and derive in useMemo — calling getFilteredDocuments()
  // directly in a selector returns a fresh array every render and causes
  // React's "getSnapshot should be cached" warning + potential loops.
  const documents = useDocumentStore((s) => s.documents);
  const search = useDocumentStore((s) => s.search);
  const categoryFilter = useDocumentStore((s) => s.categoryFilter);
  const sortField = useDocumentStore((s) => s.sortField);
  const sortDir = useDocumentStore((s) => s.sortDir);
  const storeFiltered = useMemo(() => {
    let list = [...documents];
    if (categoryFilter !== 'all') list = list.filter((d) => d.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (listId) {
      const memberIds = new Set(memberships.filter((m) => m.listId === listId).map((m) => m.entityId));
      list = list.filter((d) => memberIds.has(d.id));
    }
    list.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [documents, search, categoryFilter, sortField, sortDir, listId, memberships]);
  const presortedDocs = externalDocs ?? storeFiltered;
  const uploaderOptions = useMemo(() => {
    const set = new Set<string>();
    presortedDocs.forEach((d) => { if (d.uploadedBy) set.add(d.uploadedBy); });
    return [...set].sort();
  }, [presortedDocs]);
  const docs = useMemo(() => {
    let list = [...presortedDocs];
    if (catFilter !== 'all') list = list.filter((d) => d.category === catFilter);
    if (dateFrom) list = list.filter((d) => d.uploadedAt >= dateFrom);
    if (dateTo) list = list.filter((d) => d.uploadedAt <= dateTo);
    if (uploadedByFilter) list = list.filter((d) => d.uploadedBy === uploadedByFilter);
    list.sort((a, b) => {
      switch (cardSort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'uploadedAt': return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'size': return b.size - a.size;
        case 'category': return a.category.localeCompare(b.category);
        case 'uploadedBy': return a.uploadedBy.localeCompare(b.uploadedBy);
        default: return 0;
      }
    });
    return list;
  }, [presortedDocs, cardSort, catFilter, dateFrom, dateTo, uploadedByFilter]);

  if (docs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-[12px] text-[var(--text-tertiary)]">
        No documents found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 min-h-[34px]">
        {/* View picker — always first */}
        <SavedCardViewBar
          scope="documents"
          currentFilters={{ cardSort, catFilter, dateFrom, dateTo, uploadedByFilter }}
          onLoadView={(f) => {
            if (f.cardSort) setCardSort(f.cardSort as DocCardSort);
            if (f.catFilter) setCatFilter(f.catFilter as DocCategoryFilter);
            setDateFrom(String(f.dateFrom || ''));
            setDateTo(String(f.dateTo || ''));
            setUploadedByFilter(String(f.uploadedByFilter || ''));
          }}
        />

        <button onClick={() => setShowDocFilters(!showDocFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border cursor-pointer transition-all ${
            showDocFilters || activeDocFilterCount > 0
              ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border)] hover:border-[var(--brand-primary)]'
          }`}>
          <Funnel size={14} weight="bold" /> Filters{activeDocFilterCount > 0 ? ` (${activeDocFilterCount})` : ''}
        </button>
        <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
          {docs.length} {docs.length === 1 ? 'document' : 'documents'}
        </span>
      </div>
      {showDocFilters && (
        <div className="flex items-center gap-2 flex-wrap pb-1">
          {/* Sort */}
          <select value={cardSort} onChange={(e) => setCardSort(e.target.value as DocCardSort)}
            className="h-[28px] px-2 text-[11px] font-bold bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
            <option value="uploadedAt">Sort: Date Uploaded</option>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="category">Sort: Category</option>
            <option value="uploadedBy">Sort: Uploaded By</option>
          </select>

          {/* Category */}
          <div className="inline-flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-0.5">
            {(['all', 'contract', 'proposal', 'invoice', 'report', 'image'] as DocCategoryFilter[]).map((c) => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors capitalize ${
                  catFilter === c ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>{c}</button>
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

          {/* Uploaded by */}
          {uploaderOptions.length > 0 && (
            <select value={uploadedByFilter} onChange={(e) => setUploadedByFilter(e.target.value)}
              className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
              <option value="">All uploaders</option>
              {uploaderOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {/* Clear */}
          {activeDocFilterCount > 0 && (
            <button onClick={() => { setCardSort('uploadedAt'); setCatFilter('all'); setDateFrom(''); setDateTo(''); setUploadedByFilter(''); }}
              className="text-[11px] font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer hover:underline">
              Clear all
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-8">
        {docs.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onPreview={onPreview} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
