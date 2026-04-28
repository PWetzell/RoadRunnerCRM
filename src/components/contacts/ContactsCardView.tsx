'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContactStore } from '@/stores/contact-store';
import { useListStore } from '@/stores/list-store';
import { useUserStore } from '@/stores/user-store';
import { getAvatarColor, initials } from '@/lib/utils';
import { CheckCircle, Warning, EyeSlash, Tag, Funnel, Rows, EnvelopeSimple } from '@phosphor-icons/react';
import { ContactWithEntries } from '@/types/contact';
import { useUnreadCountForContact } from '@/hooks/use-unread-emails';
import InlineCardSettings, { useCardStyleVars, useCardHeaderColor } from '@/components/ui/InlineCardSettings';
import SavedCardViewBar from '@/components/ui/SavedCardViewBar';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { useGridLayoutStore } from '@/stores/grid-layout-store';
import { cardDensityStyle, DENSITY_LABELS, DENSITY_HINTS, GridDensity } from '@/lib/grid-density';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';

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
  // Favorites toggle (top-of-page Favorites pill writes ?fav=1 to the URL).
  // Card view was previously ignoring this — fixed 2026-04-28.
  const favOnly = searchParams.get('fav') === '1';
  const contacts = useContactStore((s) => s.contacts);
  const filter = useContactStore((s) => s.filter);
  const search = useContactStore((s) => s.search);
  const memberships = useListStore((s) => s.memberships);
  const gridDensity = useUserStore((s) => s.gridDensity);
  const setGridDensity = useUserStore((s) => s.setGridDensity);
  // Card-view filter + sort state, persisted under scope "contacts" so a
  // refresh restores everything the user picked. Loaded once from the
  // grid-layout store on mount.
  const persisted = useGridLayoutStore.getState().getCardViewState('contacts');
  const setCardViewState = useGridLayoutStore((s) => s.setCardViewState);
  const [sortBy, _setSortBy] = useState<CardSort>((persisted.sortBy as CardSort) || 'lastUpdated');
  const [statusFilter, _setStatusFilter] = useState<StatusFilter>((persisted.statusFilter as StatusFilter) || 'all');
  const [dateFrom, _setDateFrom] = useState(String(persisted.dateFrom || ''));
  const [dateTo, _setDateTo] = useState(String(persisted.dateTo || ''));
  const [createdByFilter, _setCreatedByFilter] = useState(String(persisted.createdByFilter || ''));
  const [privateOnly, _setPrivateOnly] = useState(Boolean(persisted.privateOnly));
  const [showFilters, setShowFilters] = useState(false);
  // Mirror every state change back into the persisted store so the next
  // refresh picks them up. Wrapped setters keep the local UI snappy
  // (synchronous setState) while still writing through.
  const writeThrough = (patch: Record<string, unknown>) => {
    const current = useGridLayoutStore.getState().getCardViewState('contacts');
    setCardViewState('contacts', { ...current, ...patch });
  };
  const setSortBy = (v: CardSort) => { _setSortBy(v); writeThrough({ sortBy: v }); };
  const setStatusFilter = (v: StatusFilter) => { _setStatusFilter(v); writeThrough({ statusFilter: v }); };
  const setDateFrom = (v: string) => { _setDateFrom(v); writeThrough({ dateFrom: v }); };
  const setDateTo = (v: string) => { _setDateTo(v); writeThrough({ dateTo: v }); };
  const setCreatedByFilter = (v: string) => { _setCreatedByFilter(v); writeThrough({ createdByFilter: v }); };
  const setPrivateOnly = (v: boolean) => { _setPrivateOnly(v); writeThrough({ privateOnly: v }); };
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const densityMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showDensityMenu) return;
    const onClick = (e: MouseEvent) => {
      if (densityMenuRef.current && !densityMenuRef.current.contains(e.target as Node)) {
        setShowDensityMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showDensityMenu]);

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
    // Favorites filter — mirrors the list-view path in DataGrid.tsx so
    // the Favorites toggle behaves identically across List + Card views.
    if (favOnly) {
      const favIds = new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.contact).map((m) => m.entityId));
      l = l.filter((c) => favIds.has(c.id));
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
  }, [contacts, filter, search, sortBy, statusFilter, dateFrom, dateTo, createdByFilter, privateOnly, urlPrivate, listId, favOnly, memberships]);

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

        {/* Density picker — same 3 presets as the grid view, shared via useUserStore */}
        <div className="relative" ref={densityMenuRef} data-tour="card-density-menu">
          <button
            onClick={() => setShowDensityMenu(!showDensityMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            title="Card density"
          >
            <Rows size={14} weight="bold" /> Density
          </button>
          {showDensityMenu && (
            <div className="absolute left-0 top-9 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-[70] w-[240px] py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1 px-3">Card density</div>
              {(['compact', 'comfortable', 'spacious'] as GridDensity[]).map((d) => {
                const active = gridDensity === d;
                return (
                  <button
                    key={d}
                    onClick={() => { setGridDensity(d); setShowDensityMenu(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-left bg-transparent border-none cursor-pointer ${
                      active ? 'bg-[var(--brand-bg)]' : 'hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-[var(--brand-primary)]' : 'bg-transparent border border-[var(--border-strong)]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] font-bold ${active ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>{DENSITY_LABELS[d]}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">{DENSITY_HINTS[d]}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
            <option value="lastUpdated">Sort: Last Activity</option>
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
      <div className="flex-1 overflow-y-auto pb-3" style={cardDensityStyle(gridDensity)} data-density={gridDensity}>
        <div
          className="grid"
          style={{
            gap: 'var(--card-gap)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(var(--card-col-width), 1fr))',
          }}
        >
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
  // Surface unread email pressure on the card header — keeps parity with
  // ContactTable's list-view chip. Only renders when unread > 0 so the
  // card layout for cold contacts is unchanged. Reactive via the store's
  // read-override set so reading an email clears the chip immediately.
  const unread = useUnreadCountForContact(c.id);

  const cardKey = `contact-card-${c.id}`;
  const cssVars = useCardStyleVars(cardKey);
  const accent = useCardHeaderColor(cardKey);

  const mergedVars = { ...cssVars, padding: 'var(--card-p)', gap: 'calc(var(--card-p) * 0.55)' } as React.CSSProperties;
  const avatarFont = 'calc(var(--card-avatar) * 0.29)';

  return (
    <div
      onClick={onOpen}
      style={mergedVars}
      className="group/icard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl text-left hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer flex flex-col"
    >
      {accent && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: accent }} />}
      {/* Favorite star — pinned to top-right, just left of the settings
          gear, so it doesn't get buried under the avatar (which dominates
          the top-left). Mirrors the list-view star-column toggle. */}
      <div className="absolute top-0.5 right-8 z-10">
        <FavoriteCell entityId={c.id} entityType="contact" />
      </div>
      <InlineCardSettings cardId={cardKey} title={c.name} defaultIconName={isOrg ? 'Buildings' : 'User'} />
      {/* Header: avatar only */}
      <div className="flex items-start gap-2">
        <div
          className="flex items-center justify-center font-extrabold text-white flex-shrink-0"
          style={{
            background: getAvatarColor(c.id, c.avatarColor),
            borderRadius: isOrg ? '8px' : '50%',
            width: 'var(--card-avatar)',
            height: 'var(--card-avatar)',
            fontSize: avatarFont,
          }}
        >
          {initials(c.name)}
        </div>
      </div>

      {/* Name + subtitle */}
      <div className="min-w-0 pr-8">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-[var(--text-primary)] truncate" style={{ fontSize: 'var(--card-name-font)' }}>{c.name}</span>
          {c.isPrivate && <EyeSlash size={12} className="text-[var(--danger)] flex-shrink-0" />}
          {unread > 0 && (
            <span
              aria-label={`${unread} unread email${unread === 1 ? '' : 's'}`}
              title={`${unread} unread email${unread === 1 ? '' : 's'}`}
              className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold leading-none flex-shrink-0"
            >
              <EnvelopeSimple size={10} weight="fill" />
              {unread}
            </span>
          )}
        </div>
        <div className="text-[var(--text-secondary)] truncate" style={{ fontSize: 'var(--card-sub-font)' }}>{subtitle || '—'}</div>
      </div>

      {/* Status + Tags */}
      <div className="flex items-center gap-1 flex-nowrap overflow-hidden" style={{ fontSize: 'var(--card-chip-font)' }}>
        {c.stale ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] whitespace-nowrap flex-shrink-0">
            <Warning size={9} /> Incomplete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)] whitespace-nowrap flex-shrink-0">
            <CheckCircle size={9} /> Complete
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 whitespace-nowrap ${tagColorClass(t)}`}
          >
            <Tag size={8} weight="fill" /> {t}
          </span>
        ))}
        {(c.tags || []).length > 2 && (
          <span className="text-[var(--text-tertiary)] flex-shrink-0">+{(c.tags || []).length - 2}</span>
        )}
      </div>

      {/* Type pill */}
      <div className="mt-auto pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between" style={{ fontSize: 'var(--card-chip-font)' }}>
        <span className="text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">
          {isOrg ? 'Organization' : 'Person'}
        </span>
        {c.assignedTo && (
          <span className="text-[var(--text-tertiary)] truncate">{c.assignedTo}</span>
        )}
      </div>
    </div>
  );
}
