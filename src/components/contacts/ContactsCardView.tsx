'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowsDownUp } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useListStore } from '@/stores/list-store';
import { getAvatarColor, initials } from '@/lib/utils';
import { CheckCircle, Warning, EyeSlash, Tag, Funnel } from '@phosphor-icons/react';
import { ContactWithEntries } from '@/types/contact';
import InlineCardSettings, { useCardStyleVars, useCardHeaderColor } from '@/components/ui/InlineCardSettings';
import SavedCardViewBar from '@/components/ui/SavedCardViewBar';

const TAG_PALETTE = [
  'bg-[var(--brand-bg)] text-[var(--brand-primary)]',
  'bg-[var(--ai-bg)] text-[var(--ai-dark)]',
  'bg-[#FCE7F3] text-[#BE185D]',
  'bg-[#CFFAFE] text-[#0E7490]',
];

function tagColorClass(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

type CardSort = 'name' | 'lastUpdated' | 'status' | 'type';
type StatusFilter = 'all' | 'complete' | 'incomplete';

export default function ContactsCardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  const urlPrivate = searchParams.get('private') === '1';
  const contacts = useContactStore((s) => s.contacts);
  const filter = useContactStore((s) => s.filter);
  const search = useContactStore((s) => s.search);
  const memberships = useListStore((s) => s.memberships);
  const [sortBy, setSortBy] = useState<CardSort>('lastUpdated');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [privateOnly, setPrivateOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Get unique createdBy values
  const createdByOptions = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => { if (c.createdBy) set.add(c.createdBy); if (c.assignedTo) set.add(c.assignedTo); });
    return [...set].sort();
  }, [contacts]);

  const list = useMemo(() => {
    let l = [...contacts];
    if (filter !== 'all') l = l.filter((c) => c.type === filter);
    if (search) {
      const q = search.toLowerCase();
      l = l.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        ('industry' in c ? (c.industry || '').toLowerCase().includes(q) : false) ||
        ('title' in c ? (c.title || '').toLowerCase().includes(q) : false) ||
        ('orgName' in c ? (c.orgName || '').toLowerCase().includes(q) : false)
      );
    }
    // Status filter
    if (statusFilter === 'complete') l = l.filter((c) => !c.stale);
    if (statusFilter === 'incomplete') l = l.filter((c) => c.stale);
    // Date range
    if (dateFrom) l = l.filter((c) => c.lastUpdated >= dateFrom);
    if (dateTo) l = l.filter((c) => c.lastUpdated <= dateTo);
    // Created by
    if (createdByFilter) l = l.filter((c) => c.createdBy === createdByFilter || c.assignedTo === createdByFilter);
    // Private only (either the URL ?private=1 from the top-level toggle OR the local advanced-panel checkbox)
    if (privateOnly || urlPrivate) l = l.filter((c) => c.isPrivate);
    // List filter
    if (listId) {
      const memberIds = new Set(memberships.filter((m) => m.listId === listId).map((m) => m.entityId));
      l = l.filter((c) => memberIds.has(c.id));
    }
    // Sort
    l.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'lastUpdated': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'status': return (a.stale ? 1 : 0) - (b.stale ? 1 : 0);
        case 'type': return a.type.localeCompare(b.type);
        default: return 0;
      }
    });
    return l;
  }, [contacts, filter, search, sortBy, statusFilter, dateFrom, dateTo, createdByFilter, privateOnly, urlPrivate, listId, memberships]);

  const activeFilterCount = [statusFilter !== 'all', !!dateFrom, !!dateTo, !!createdByFilter, privateOnly, sortBy !== 'lastUpdated'].filter(Boolean).length;

  if (list.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
        No contacts match your filter.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap min-h-[34px] px-0">
        {/* View picker — always first */}
        <SavedCardViewBar
          scope="contacts"
          currentFilters={{ sortBy, statusFilter, dateFrom, dateTo, createdByFilter, privateOnly: String(privateOnly) }}
          onLoadView={(f) => {
            if (f.sortBy) setSortBy(f.sortBy as CardSort);
            if (f.statusFilter) setStatusFilter(f.statusFilter as StatusFilter);
            setDateFrom(String(f.dateFrom || ''));
            setDateTo(String(f.dateTo || ''));
            setCreatedByFilter(String(f.createdByFilter || ''));
            setPrivateOnly(f.privateOnly === 'true');
          }}
        />

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border cursor-pointer transition-all ${
            showFilters || activeFilterCount > 0
              ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border)] hover:border-[var(--brand-primary)]'
          }`}
        >
          <Funnel size={14} weight="bold" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
          {list.length} {list.length === 1 ? 'contact' : 'contacts'}
        </span>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap px-0 pb-1">
          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as CardSort)}
            className="h-[28px] px-2 text-[11px] font-bold bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
            <option value="lastUpdated">Sort: Date Updated</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
            <option value="type">Sort: Type</option>
          </select>

          {/* Status */}
          <div className="inline-flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-0.5">
            {(['all', 'complete', 'incomplete'] as StatusFilter[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors capitalize ${
                  statusFilter === s ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>{s}</button>
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

          {/* Created by */}
          {createdByOptions.length > 0 && (
            <select value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)}
              className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
              <option value="">All owners</option>
              {createdByOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {/* Private */}
          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={privateOnly} onChange={(e) => setPrivateOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[var(--brand-primary)]" />
            Private only
          </label>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); setCreatedByFilter(''); setPrivateOnly(false); setSortBy('lastUpdated'); }}
              className="text-[11px] font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer hover:underline">
              Clear all
            </button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto pb-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {list.map((c) => (
            <ContactCard key={c.id} c={c} onOpen={() => router.push(`/contacts/${c.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactCard({ c, onOpen }: { c: ContactWithEntries; onOpen: () => void }) {
  const isOrg = c.type === 'org';
  const subtitle = isOrg
    ? ('industry' in c ? c.industry : '')
    : ('title' in c && c.title ? c.title : '') + ('orgName' in c && c.orgName ? ` · ${c.orgName}` : '');
  const tags = (c.tags || []).slice(0, 2);

  const cardKey = `contact-card-${c.id}`;
  const cssVars = useCardStyleVars(cardKey);
  const accent = useCardHeaderColor(cardKey);

  return (
    <div
      onClick={onOpen}
      style={cssVars}
      className="group/icard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-3 text-left hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer flex flex-col gap-2"
    >
      {accent && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: accent }} />}
      <InlineCardSettings cardId={cardKey} title={c.name} defaultIconName={isOrg ? 'Buildings' : 'User'} />
      {/* Header: avatar only */}
      <div className="flex items-start gap-2">
        <div
          className="w-12 h-12 flex items-center justify-center text-[14px] font-extrabold text-white flex-shrink-0"
          style={{ background: getAvatarColor(c.id, c.avatarColor), borderRadius: isOrg ? '8px' : '50%' }}
        >
          {initials(c.name)}
        </div>
      </div>

      {/* Name + subtitle */}
      <div className="min-w-0 pr-8">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-extrabold text-[var(--text-primary)] truncate">{c.name}</span>
          {c.isPrivate && <EyeSlash size={12} className="text-[var(--danger)] flex-shrink-0" />}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] truncate">{subtitle || '—'}</div>
      </div>

      {/* Status + Tags */}
      <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
        {c.stale ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] whitespace-nowrap flex-shrink-0">
            <Warning size={9} /> Incomplete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] whitespace-nowrap flex-shrink-0">
            <CheckCircle size={9} /> Complete
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 whitespace-nowrap ${tagColorClass(t)}`}
          >
            <Tag size={8} weight="fill" /> {t}
          </span>
        ))}
        {(c.tags || []).length > 2 && (
          <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">+{(c.tags || []).length - 2}</span>
        )}
      </div>

      {/* Type pill */}
      <div className="mt-auto pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">
          {isOrg ? 'Organization' : 'Person'}
        </span>
        {c.assignedTo && (
          <span className="text-[10px] text-[var(--text-tertiary)] truncate">{c.assignedTo}</span>
        )}
      </div>
    </div>
  );
}
