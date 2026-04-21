'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Funnel, Sparkle, Buildings } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { RECRUITING_STAGES, RecruitingStage, dealStageToRecruitingStage, CandidateCard } from '@/types/recruiting';
import { initials, getAvatarColor } from '@/lib/utils';
import InlineCardSettings, { useCardStyleVars, useCardHeaderColor } from '@/components/ui/InlineCardSettings';
import { useIsDark } from '@/hooks/useIsDark';
import SavedCardViewBar from '@/components/ui/SavedCardViewBar';

type RecCardSort = 'matchScore' | 'name' | 'lastActivity' | 'dealAmount';
type RecStageFilter = RecruitingStage | 'all';

export default function RecruitingCardView({ search }: { search: string }) {
  const router = useRouter();
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);

  const [sortBy, setSortBy] = useState<RecCardSort>('matchScore');
  const [stageFilter, setStageFilter] = useState<RecStageFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [stageFilter !== 'all', !!dateFrom, !!dateTo, !!sourceFilter, sortBy !== 'matchScore'].filter(Boolean).length;

  const cards = useMemo<CandidateCard[]>(() => {
    const allCards = deals
      .filter((d) => d.type === 'person' || d.personContactId)
      .map((d) => {
        const person = contacts.find((c) => c.id === d.personContactId);
        const org = contacts.find((c) => c.id === d.orgContactId);
        const base = d.probability || 50;
        const bonus = person && 'title' in person && person.title ? 15 : 0;
        const matchScore = Math.min(99, base + bonus + (d.amount > 50000 ? 10 : 0));
        return {
          id: d.id, name: person?.name || d.name,
          title: person && person.type === 'person' ? person.title : undefined,
          company: org?.name || (person && person.type === 'person' ? person.orgName : undefined),
          avatarColor: person?.avatarColor,
          stage: dealStageToRecruitingStage(d.stage),
          dealId: d.id, dealName: d.name, dealAmount: d.amount,
          lastActivity: d.lastUpdated, source: d.source, matchScore,
          personContactId: d.personContactId,
        };
      });

    // Deduplicate by person — keep the most recently updated deal per person
    const byPerson = new Map<string, CandidateCard>();
    for (const card of allCards) {
      const key = card.personContactId || card.id;
      const existing = byPerson.get(key);
      if (!existing || (card.lastActivity || '') > (existing.lastActivity || '')) {
        byPerson.set(key, card);
      }
    }
    let list = Array.from(byPerson.values());

    if (search) { const q = search.toLowerCase(); list = list.filter((c) => c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)); }
    if (stageFilter !== 'all') list = list.filter((c) => c.stage === stageFilter);
    if (dateFrom) list = list.filter((c) => (c.lastActivity || '') >= dateFrom);
    if (dateTo) list = list.filter((c) => (c.lastActivity || '') <= dateTo);
    if (sourceFilter) list = list.filter((c) => c.source === sourceFilter);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'matchScore': return (b.matchScore || 0) - (a.matchScore || 0);
        case 'lastActivity': return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
        case 'dealAmount': return b.dealAmount - a.dealAmount;
        default: return 0;
      }
    });
    return list;
  }, [deals, contacts, search, sortBy, stageFilter, dateFrom, dateTo, sourceFilter]);

  const isDark = useIsDark();
  const STAGE_COLOR: Record<RecruitingStage, string> = Object.fromEntries(RECRUITING_STAGES.map((s) => [s.id, isDark ? s.darkColor : s.color])) as Record<RecruitingStage, string>;

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap min-h-[34px]">
        <SavedCardViewBar
          scope="recruiting"
          currentFilters={{ sortBy, stageFilter, dateFrom, dateTo, sourceFilter }}
          onLoadView={(f) => {
            if (f.sortBy) setSortBy(f.sortBy as RecCardSort);
            if (f.stageFilter) setStageFilter(f.stageFilter as RecStageFilter);
            setDateFrom(String(f.dateFrom || ''));
            setDateTo(String(f.dateTo || ''));
            setSourceFilter(String(f.sourceFilter || ''));
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
          {cards.length} {cards.length === 1 ? 'candidate' : 'candidates'}
        </span>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap pb-1">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as RecCardSort)}
            className="h-[28px] px-2 text-[11px] font-bold bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
            <option value="matchScore">Sort: Match Score</option>
            <option value="lastActivity">Sort: Last Activity</option>
            <option value="name">Sort: Name</option>
            <option value="dealAmount">Sort: Amount</option>
          </select>
          <div className="inline-flex items-center gap-0.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-full p-0.5">
            <button onClick={() => setStageFilter('all')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none ${stageFilter === 'all' ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}>All</button>
            {RECRUITING_STAGES.filter((s) => s.id !== 'rejected').map((s) => (
              <button key={s.id} onClick={() => setStageFilter(s.id)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer border-none ${stageFilter === s.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-transparent text-[var(--text-secondary)]'}`}>{s.label}</button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
            <span>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none" />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-[28px] px-2 text-[11px] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none cursor-pointer">
            <option value="">All sources</option>
            {['Inbound','Outbound','Referral','Event','Partner','Marketing'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeFilterCount > 0 && (
            <button onClick={() => { setSortBy('matchScore'); setStageFilter('all'); setDateFrom(''); setDateTo(''); setSourceFilter(''); }}
              className="text-[11px] font-bold text-[var(--danger)] bg-transparent border-none cursor-pointer hover:underline">Clear all</button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-3">
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-[12px] text-[var(--text-tertiary)]">No candidates match your filters.</div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {cards.map((card) => <CandidateCardItem key={card.id} card={card} stageColor={STAGE_COLOR} onOpen={() => router.push(card.personContactId ? `/contacts/${card.personContactId}` : `/sales/${card.dealId}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateCardItem({ card, stageColor, onOpen }: { card: CandidateCard; stageColor: Record<RecruitingStage, string>; onOpen: () => void }) {
  const cardKey = `recruit-card-${card.id}`;
  const cssVars = useCardStyleVars(cardKey);
  const accent = useCardHeaderColor(cardKey);
  const stageLabel = RECRUITING_STAGES.find((s) => s.id === card.stage)?.label || card.stage;

  return (
    <div onClick={onOpen} style={cssVars}
      className="group/icard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer flex flex-col gap-2">
      {accent && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: accent }} />}
      <InlineCardSettings cardId={cardKey} title={card.name} defaultIconName="User" />

      <div className="flex items-center gap-2.5 pr-8">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
          style={{ background: getAvatarColor(card.id, card.avatarColor) }}>
          {initials(card.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{card.name}</div>
          {card.title && <div className="text-[11px] text-[var(--text-tertiary)] truncate">{card.title}</div>}
        </div>
      </div>

      {card.company && (
        <div className="text-[11px] text-[var(--text-secondary)] truncate inline-flex items-center gap-1"><Buildings size={10} />{card.company}</div>
      )}
      <div className="text-[10px] text-[var(--text-tertiary)] truncate">{card.dealName}</div>

      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white flex-shrink-0" style={{ background: stageColor[card.stage] }}>{stageLabel}</span>
      </div>

      {card.matchScore !== undefined && (
        <div className="flex items-center gap-1.5 mt-auto">
          <Sparkle size={10} weight="duotone" className="text-[var(--ai)]" />
          <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${card.matchScore}%`, background: card.matchScore >= 70 ? 'var(--success)' : card.matchScore >= 40 ? 'var(--warning)' : 'var(--danger)' }} />
          </div>
          <span className="text-[9px] font-bold text-[var(--text-secondary)]">{card.matchScore}%</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[9px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
        <span>{card.source}</span>
        <span>${card.dealAmount.toLocaleString()}</span>
        <span>{card.lastActivity}</span>
      </div>
    </div>
  );
}
