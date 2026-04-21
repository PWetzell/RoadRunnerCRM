'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, ArrowRight, Palette, ArrowClockwise } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { RECRUITING_STAGES, RecruitingStage, dealStageToRecruitingStage, CandidateCard } from '@/types/recruiting';
import { initials, getAvatarColor } from '@/lib/utils';
import InlineCardSettings, { useCardStyleVars, useCardHeaderColor } from '@/components/ui/InlineCardSettings';
import { useIsDark } from '@/hooks/useIsDark';
import { useCardStyleStore } from '@/stores/card-style-store';

const HEADER_COLOR_OPTIONS = [
  '#1955A6', '#0B2F5C', '#247A8A', '#0E7490',
  '#047857', '#065F46', '#6A0FB8', '#7C3AED',
  '#BE185D', '#9D174D', '#DC2626', '#C2410C',
  '#4F46E5', '#475569', '#1E293B',
];

/**
 * Kanban board for the recruiting pipeline. Projects existing Deals +
 * Contacts through a recruiting lens:
 *   Deal → placement opportunity
 *   Person contact → candidate
 *
 * Stages: Sourced → Screening → Interview → Offer → Placed / Rejected.
 *
 * Each card shows the candidate's name, current title, linked deal,
 * placement value, and an AI match score.
 */
export default function RecruitingKanban() {
  const router = useRouter();
  const isDark = useIsDark();
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);

  // Build candidate cards from person-type deals
  const cards = useMemo<CandidateCard[]>(() => {
    return deals
      .filter((d) => d.type === 'person' || d.personContactId)
      .map((d) => {
        const person = contacts.find((c) => c.id === d.personContactId);
        const org = contacts.find((c) => c.id === d.orgContactId);
        // Simple deterministic match score
        const base = d.probability || 50;
        const bonus = person && 'title' in person && person.title ? 15 : 0;
        const matchScore = Math.min(99, base + bonus + (d.amount > 50000 ? 10 : 0));

        return {
          id: d.id,
          name: person?.name || d.name,
          title: person && person.type === 'person' ? person.title : undefined,
          company: org?.name || (person && person.type === 'person' ? person.orgName : undefined),
          avatarColor: person?.avatarColor,
          stage: dealStageToRecruitingStage(d.stage),
          dealId: d.id,
          dealName: d.name,
          dealAmount: d.amount,
          lastActivity: d.lastUpdated,
          source: d.source,
          matchScore,
        };
      });
  }, [deals, contacts]);

  const byStage = useMemo(() => {
    const map = new Map<RecruitingStage, CandidateCard[]>();
    RECRUITING_STAGES.forEach((s) => map.set(s.id, []));
    cards.forEach((c) => map.get(c.stage)?.push(c));
    return map;
  }, [cards]);

  // Per-column custom colors stored in card-style-store
  const getColStyle = useCardStyleStore((s) => s.styles);
  const setColStyle = useCardStyleStore((s) => s.setStyle);

  return (
    <div className="flex-1 overflow-y-auto pb-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${RECRUITING_STAGES.length}, minmax(200px, 1fr))` }}>
        {RECRUITING_STAGES.map((stage) => {
          const stageCards = byStage.get(stage.id) || [];
          const colKey = `recruit-col-${stage.id}`;
          const customColor = getColStyle[colKey]?.headerColor;
          const headerColor = customColor || (isDark ? stage.darkColor : stage.color);
          return (
            <div key={stage.id} className="flex flex-col min-w-0">
              {/* Column header with color picker */}
              <RecruitingColumnHeader
                stageId={stage.id}
                label={stage.label}
                count={stageCards.length}
                headerColor={headerColor}
                isCustom={!!customColor}
                onChangeColor={(c) => setColStyle(colKey, { headerColor: c })}
                onResetColor={() => {
                  const styles = { ...useCardStyleStore.getState().styles };
                  delete styles[colKey];
                  useCardStyleStore.setState({ styles });
                }}
              />

              {/* Cards */}
              <div className="flex-1 bg-[var(--surface-bg)] border border-t-0 border-[var(--border)] rounded-b-lg p-2 flex flex-col gap-2 min-h-[200px]">
                {stageCards.map((card) => (
                  <RecruitingCard key={card.id} card={card} onOpen={(id) => router.push(`/sales/${id}`)} />
                ))}
                {stageCards.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--text-tertiary)] italic">
                    No candidates
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecruitingCard({ card, onOpen }: { card: CandidateCard; onOpen: (dealId: string) => void }) {
  const cardKey = `recruit-${card.id}`;
  const cssVars = useCardStyleVars(cardKey);
  const accent = useCardHeaderColor(cardKey);

  return (
    <div
      className="group/icard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--brand-primary)] cursor-pointer transition-colors"
      style={cssVars}
      onClick={() => card.dealId && onOpen(card.dealId)}
    >
      {accent && <div className="h-1" style={{ background: accent }} />}
      <InlineCardSettings cardId={cardKey} title={card.name} defaultIconName="User" />

      <div className="p-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-2 mb-2 pr-6">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0"
            style={{ background: getAvatarColor(card.id, card.avatarColor) }}
          >
            {initials(card.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[calc(12px*var(--content-scale,1))] font-bold text-[var(--widget-primary-text)] truncate">{card.name}</div>
            {card.title && (
              <div className="text-[calc(10px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] truncate">{card.title}</div>
            )}
          </div>
        </div>

        {/* Company */}
        {card.company && (
          <div className="text-[calc(10px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] mb-1 truncate">
            {card.company}
          </div>
        )}

        {/* Deal info */}
        <div className="text-[calc(10px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] mb-2 truncate">
          {card.dealName} · ${card.dealAmount.toLocaleString()}
        </div>

        {/* AI match score */}
        {card.matchScore !== undefined && (
          <div className="flex items-center gap-1.5">
            <Sparkle size={10} weight="duotone" className="text-[var(--ai)]" />
            <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${card.matchScore}%`,
                  background: card.matchScore >= 70 ? 'var(--success)' : card.matchScore >= 40 ? 'var(--warning)' : 'var(--danger)',
                }}
              />
            </div>
            <span className="text-[9px] font-bold text-[var(--widget-tertiary-text)]">{card.matchScore}%</span>
          </div>
        )}

        {/* Source + date */}
        <div className="flex items-center justify-between mt-2 text-[9px] text-[var(--widget-tertiary-text)]">
          <span>{card.source}</span>
          <span>{card.lastActivity}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Column header with color picker — same pattern as the Sales kanban.
 * Click the palette icon to pick a custom header color.
 */
function RecruitingColumnHeader({ stageId, label, count, headerColor, isCustom, onChangeColor, onResetColor }: {
  stageId: RecruitingStage;
  label: string;
  count: number;
  headerColor: string;
  isCustom: boolean;
  onChangeColor: (color: string) => void;
  onResetColor: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  return (
    <div
      className="rounded-t-lg px-3 py-2 flex items-center justify-between gap-2 relative"
      style={{ background: headerColor, color: 'white' }}
    >
      <span className="text-[12px] font-bold text-white">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
          aria-label="Change column color"
          title="Change header color"
          className="w-6 h-6 rounded-full flex items-center justify-center text-white bg-white/15 hover:bg-white/30 border-none cursor-pointer"
        >
          <Palette size={12} weight="fill" />
        </button>
        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-white text-[11px] font-extrabold" style={{ color: headerColor }}>
          {count}
        </span>
      </div>
      {pickerOpen && (
        <div ref={pickerRef} className="absolute right-2 top-10 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 p-2 w-[188px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Header color</div>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {HEADER_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => { onChangeColor(c); setPickerOpen(false); }}
                aria-label={c}
                className="w-6 h-6 rounded-full border-2 cursor-pointer"
                style={{ background: c, borderColor: headerColor === c ? 'var(--text-primary)' : 'transparent' }}
              />
            ))}
          </div>
          {isCustom && (
            <button
              onClick={() => { onResetColor(); setPickerOpen(false); }}
              className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-bold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)]"
            >
              <ArrowClockwise size={11} weight="bold" /> Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}
