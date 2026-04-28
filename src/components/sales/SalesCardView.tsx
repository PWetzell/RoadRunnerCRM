'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Funnel, Warning, CheckCircle, Sparkle, CurrencyDollar, CalendarCheck } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';
import { useListStore } from '@/stores/list-store';
import { useContactStore } from '@/stores/contact-store';
import { Deal, DEAL_STAGES, STAGE_META } from '@/types/deal';
import { initials, getAvatarColor, fmtDate } from '@/lib/utils';
import InlineCardSettings, { useCardStyleVars, useCardHeaderColor } from '@/components/ui/InlineCardSettings';
import SavedCardViewBar from '@/components/ui/SavedCardViewBar';
import StagePill from './StagePill';
import { FAVORITES_LIST_IDS } from '@/lib/data/seed-lists';
import FavoriteCell from '@/components/lists/FavoriteCell';
import { useGridLayoutStore } from '@/stores/grid-layout-store';

type SalesCardSort = 'lastUpdated' | 'name' | 'amount' | 'stage' | 'probability';
type StageFilter = 'all' | 'open' | 'won' | 'lost';

export default function SalesCardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  // Favorites toggle URL param — was previously not honored in card view.
  const favOnly = searchParams.get('fav') === '1';
  const memberships = useListStore((s) => s.memberships);
  const deals = useSalesStore((s) => s.deals);
  const typeFilter = useSalesStore((s) => s.typeFilter);
  const search = useSalesStore((s) => s.search);
  const contacts = useContactStore((s) => s.contacts);

  // Persisted card-view state, scope "sales".
  const persisted = useGridLayoutStore.getState().getCardViewState('sales');
  const setCardViewState = useGridLayoutStore((s) => s.setCardViewState);
  const [sortBy, _setSortBy] = useState<SalesCardSort>((persisted.sortBy as SalesCardSort) || 'lastUpdated');
  const [stageFilter, _setStageFilter] = useState<StageFilter>((persisted.stageFilter as StageFilter) || 'all');
  const [dateFrom, _setDateFrom] = useState(String(persisted.dateFrom || ''));
  const [dateTo, _setDateTo] = useState(String(persisted.dateTo || ''));
  const [showFilters, setShowFilters] = useState(false);
  const writeThrough = (patch: Record<string, unknown>) => {
    const current = useGridLayoutStore.getState().getCardViewState('sales');
    setCardViewState('sales', { ...current, ...patch });
  };
  const setSortBy = (v: SalesCardSort) => { _setSortBy(v); writeThrough({ sortBy: v }); };
  const setStageFilter = (v: StageFilter) => { _setStageFilter(v); writeThrough({ stageFilter: v }); };
  const setDateFrom = (v: string) => { _setDateFrom(v); writeThrough({ dateFrom: v }); };
  const setDateTo = (v: string) => { _setDateTo(v); writeThrough({ dateTo: v }); };

  const activeFilterCount = [stageFilter !== 'all', !!dateFrom, !!dateTo, sortBy !== 'lastUpdated'].filter(Boolean).length;

  const list = useMemo(() => {
    let l = deals.filter((d) => d.personContactId || d.orgContactId);
    if (typeFilter !== 'all') l = l.filter((d) => d.type === typeFilter);
    if (stageFilter === 'open') l = l.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
    else if (stageFilter === 'won') l = l.filter((d) => d.stage === 'closed-won');
    else if (stageFilter === 'lost') l = l.filter((d) => d.stage === 'closed-lost');
    if (search) {
      const q = search.toLowerCase();
      l = l.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (dateFrom) l = l.filter((d) => d.lastUpdated >= dateFrom);
    if (dateTo) l = l.filter((d) => d.lastUpdated <= dateTo);
    if (listId) {
      const memberIds = new Set(memberships.filter((m) => m.listId === listId).map((m) => m.entityId));
      l = l.filter((d) => memberIds.has(d.id));
    }
    if (favOnly) {
      const favIds = new Set(memberships.filter((m) => m.listId === FAVORITES_LIST_IDS.deal).map((m) => m.entityId));
      l = l.filter((d) => favIds.has(d.id));
    }
    l.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'lastUpdated': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'amount': return b.amount - a.amount;
        case 'stage': return (STAGE_META[a.stage]?.order ?? 0) - (STAGE_META[b.stage]?.order ?? 0);
        case 'probability': return b.probability - a.probability;
        default: return 0;
      }
    });
    return l;
  }, [deals, typeFilter, search, sortBy, stageFilter, dateFrom, dateTo, listId, favOnly, memberships]);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap min-h-[34px]">
        <SavedCardViewBar
          scope="sales"
          currentFilters={{ sortBy, stageFilter, dateFrom, dateTo }}
          onLoadView={(f) => {
            if (f.sortBy) setSortBy(f.sortBy as SalesCardSort);
            if (f.stageFilter) setStageFilter(f.stageFilter as StageFilter);
            setDateFrom(String(f.dateFrom || ''));
            setDateTo(String(f.dateTo || ''));
          }}
        />
        <button onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border cursor-pointer transition-all ${
            showFilters || activeFilterCount > 0
              ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border)] hover:border-[var(--brand-primary)]'
          }`}>
          <Funnel size={14} weight="bold" /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
          {list.length} {list.length === 1 ? 'deal' : 'deals'}
        </span>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap pb-1">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SalesCardSort)}
            className="h-[28px] px-2 text-[11px] font-bold bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
            <option value="lastUpdated">Sort: Date Updated</option>
            <option value="name">Sort: Name</option>
            <option value="amount">Sort: Amount</option>
            <option value="stage">Sort: Stage</option>
            <option value="probability">Sort: Probability</option>
          </select>
          <div className="inline-flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-0.5">
            {(['all', 'open', 'won', 'lost'] as StageFilter[]).map((s) => (
              <button key={s} onClick={() => setStageFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none transition-colors capitalize ${
                  stageFilter === s ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'
                }`}>{s}</button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
            <span>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setSortBy('lastUpdated'); setStageFilter('all'); setDateFrom(''); setDateTo(''); }}
              className="text-[11px] font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer hover:underline">Clear all</button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-3">
        {list.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-[12px] text-[var(--text-tertiary)]">No deals match your filters.</div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {list.map((deal) => <SalesDealCard key={deal.id} deal={deal} contacts={contacts} onOpen={() => router.push(deal.personContactId ? `/contacts/${deal.personContactId}` : `/sales/${deal.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function SalesDealCard({ deal, contacts, onOpen }: { deal: Deal; contacts: ReturnType<typeof useContactStore.getState>['contacts']; onOpen: () => void }) {
  const person = deal.personContactId ? contacts.find((c) => c.id === deal.personContactId) : undefined;
  const org = deal.orgContactId ? contacts.find((c) => c.id === deal.orgContactId) : undefined;
  const cardKey = `sales-card-${deal.id}`;
  const cssVars = useCardStyleVars(cardKey);
  const accent = useCardHeaderColor(cardKey);
  const fmtMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

  return (
    <div
      onClick={onOpen}
      style={cssVars}
      className="group/icard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer flex flex-col gap-2"
    >
      {accent && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: accent }} />}
      <div className="absolute top-0.5 right-8 z-10">
        <FavoriteCell entityId={deal.id} entityType="deal" />
      </div>
      <InlineCardSettings cardId={cardKey} title={deal.name} defaultIconName="Handbag" />

      <div className="flex items-center gap-2.5 pr-8">
        {person ? (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
            style={{ background: getAvatarColor(person.id, person.avatarColor) }}>
            {initials(person.name)}
          </div>
        ) : org ? (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
            style={{ background: getAvatarColor(org.id, org.avatarColor) }}>
            {initials(org.name)}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{person?.name || deal.name}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] truncate">
            {org?.name || 'No company'}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-[var(--text-secondary)] truncate">{deal.name}</div>

      <div className="flex items-center gap-1.5">
        <StagePill stage={deal.stage} size="sm" />
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] mt-auto pt-1 border-t border-[var(--border-subtle)]">
        <span className="inline-flex items-center gap-1"><CurrencyDollar size={10} /> {fmtMoney(deal.amount)}</span>
        <span className="inline-flex items-center gap-1"><Sparkle size={10} weight="duotone" /> {deal.probability}%</span>
        <span className="inline-flex items-center gap-1"><CalendarCheck size={10} /> {fmtDate(deal.expectedCloseDate)}</span>
      </div>
    </div>
  );
}
