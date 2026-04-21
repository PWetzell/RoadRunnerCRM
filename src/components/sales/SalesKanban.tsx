'use client';

import { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CaretDown, CaretRight, Palette, ArrowClockwise, Gear } from '@phosphor-icons/react';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { DealStage, DEAL_STAGES } from '@/types/deal';
import { Deal } from '@/types/deal';
import { getAvatarColor, initials, fmtDate } from '@/lib/utils';
import { useIsDark } from '@/hooks/useIsDark';
import { useCardStyleStore, CardStyle } from '@/stores/card-style-store';

const EMPTY_KANBAN_STYLE: CardStyle = {};
import WidgetSettingsPopover from '@/components/dashboard/WidgetSettingsPopover';
import { WidgetConfig, WidgetType } from '@/types/dashboard';
import StagePill from './StagePill';

const TEXT_SIZE_VAR: Record<string, string> = {
  sm: '0.85', md: '1', lg: '1.15', xl: '1.35', xxl: '1.6',
};

const HEADER_COLOR_OPTIONS = [
  '#1955A6', '#0B2F5C', '#247A8A', '#0E7490',
  '#047857', '#065F46', '#6A0FB8', '#7C3AED',
  '#BE185D', '#9D174D', '#DC2626', '#C2410C',
  '#4F46E5', '#475569', '#1E293B',
];

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

export default function SalesKanban() {
  const router = useRouter();
  const isDark = useIsDark();
  const allDeals = useSalesStore((s) => s.deals);
  const stageFilter = useSalesStore((s) => s.stageFilter);
  const typeFilter = useSalesStore((s) => s.typeFilter);
  const search = useSalesStore((s) => s.search);
  const stageColors = useSalesStore((s) => s.stageColors);
  const setStageColor = useSalesStore((s) => s.setStageColor);
  const updateDeal = useSalesStore((s) => s.updateDeal);
  const contacts = useContactStore((s) => s.contacts);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const overId = String(over.id);
    // Droppable zones use IDs like `stage-${stageId}`
    if (overId.startsWith('stage-')) {
      const newStage = overId.slice('stage-'.length) as DealStage;
      const deal = allDeals.find((d) => d.id === dealId);
      if (deal && deal.stage !== newStage) {
        updateDeal(dealId, {
          stage: newStage,
          ...(newStage === 'closed-lost' || newStage === 'closed-won'
            ? { closedAt: new Date().toISOString().split('T')[0] }
            : {}),
        });
      }
    }
  }

  const filtered = useMemo(() => {
    let list = [...allDeals];
    if (typeFilter !== 'all') {
      list = list.filter((d) => d.type === typeFilter);
    }
    if (stageFilter !== 'all') {
      if (stageFilter === 'open') list = list.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
      else if (stageFilter === 'won') list = list.filter((d) => d.stage === 'closed-won');
      else if (stageFilter === 'lost') list = list.filter((d) => d.stage === 'closed-lost');
      else list = list.filter((d) => d.stage === stageFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    return list;
  }, [allDeals, stageFilter, typeFilter, search]);

  const byStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();
    DEAL_STAGES.forEach((s) => map.set(s.id, []));
    filtered.forEach((d) => map.get(d.stage)?.push(d));
    return map;
  }, [filtered]);

  const contactById = useMemo(() => {
    const m = new Map<string, typeof contacts[number]>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const totalDeals = allDeals.length;
  return (
    <div className="h-full flex flex-col gap-2">
      {/* Mirror the list-view toolbar height/layout so switching views doesn't bounce */}
      <div className="flex items-center gap-2 flex-wrap min-h-[34px]">
        <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
          {totalDeals} {totalDeals === 1 ? 'deal' : 'deals'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pb-3">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {DEAL_STAGES.map((stage) => {
            const dealsInStage = byStage.get(stage.id) || [];
            return (
              <KanbanColumn
                key={stage.id}
                stageId={stage.id}
                count={dealsInStage.length}
                deals={dealsInStage}
                contactById={contactById}
                onOpen={(id) => router.push(`/sales/${id}`)}
                headerColor={stageColors[stage.id] || (isDark ? stage.darkColor : stage.color)}
                onChangeHeaderColor={(color) => setStageColor(stage.id, color)}
                isCustomColor={!!stageColors[stage.id]}
              />
            );
          })}
          </div>
          {/* Floating preview of the dragging card */}
          <DragOverlay dropAnimation={null}>
            {activeDragId ? (
              <div className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-lg px-3 py-2 shadow-xl rotate-1 opacity-95">
                <div className="text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[220px]">
                  {allDeals.find((d) => d.id === activeDragId)?.name || 'Deal'}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function KanbanColumn({ stageId, count, deals, contactById, onOpen, headerColor, onChangeHeaderColor, isCustomColor }: {
  stageId: DealStage;
  count: number;
  deals: Deal[];
  contactById: Map<string, ReturnType<typeof useContactStore.getState>['contacts'][number]>;
  onOpen: (id: string) => void;
  headerColor: string;
  onChangeHeaderColor: (color: string | undefined) => void;
  isCustomColor: boolean;
}) {
  const total = deals.reduce((sum, d) => sum + d.amount, 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  // Drop zone for drag-to-change-stage
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `stage-${stageId}` });

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Column header */}
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between gap-2 relative"
        style={{ background: headerColor, color: 'white' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <StagePill stage={stageId} />
          <span className="text-[10px] font-semibold opacity-90 whitespace-nowrap">{fmtMoney(total)}</span>
        </div>
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
                  onClick={() => { onChangeHeaderColor(c); setPickerOpen(false); }}
                  aria-label={c}
                  className="w-6 h-6 rounded-full border-2 cursor-pointer"
                  style={{ background: c, borderColor: headerColor === c ? 'var(--text-primary)' : 'transparent' }}
                />
              ))}
            </div>
            {isCustomColor && (
              <button
                onClick={() => { onChangeHeaderColor(undefined); setPickerOpen(false); }}
                className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-bold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)]"
              >
                <ArrowClockwise size={11} weight="bold" /> Reset to default
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cards — drop zone for drag-to-change-stage */}
      <div
        ref={setDropRef}
        className={`flex-1 border border-t-0 rounded-b-lg p-2 overflow-y-auto flex flex-col gap-2 min-h-[200px] transition-colors ${
          isOver
            ? 'bg-[var(--brand-bg)] border-[var(--brand-primary)] border-dashed border-2'
            : 'bg-[var(--surface-bg)] border-[var(--border)]'
        }`}
      >
        {deals.length === 0 && (
          <div className="text-[11px] text-[var(--text-tertiary)] text-center py-6">
            {isOver ? 'Drop to move here' : 'No deals'}
          </div>
        )}
        {deals.map((d) => (
          <KanbanCard key={d.id} deal={d} contactById={contactById} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ deal, contactById, onOpen }: {
  deal: Deal;
  contactById: Map<string, ReturnType<typeof useContactStore.getState>['contacts'][number]>;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const gearRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const person = deal.personContactId ? contactById.get(deal.personContactId) : undefined;
  const org = deal.orgContactId ? contactById.get(deal.orgContactId) : undefined;

  const cardId = `kanban-${deal.id}`;
  // Subscribe to this card's slot directly — the getStyle() method returns
  // a new object on missing keys and would trigger infinite re-renders.
  const style = useCardStyleStore((s) => s.styles[cardId]) || EMPTY_KANBAN_STYLE;
  const setStyle = useCardStyleStore((s) => s.setStyle);

  // Make the card draggable so the user can drop it onto another stage column
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: deal.id,
    disabled: settingsOpen || expanded,
  });

  // Popover positioning
  useLayoutEffect(() => {
    if (!settingsOpen || !gearRef.current || !settingsRef.current) return;
    const compute = () => {
      const gearRect = gearRef.current!.getBoundingClientRect();
      const popoverRect = settingsRef.current!.getBoundingClientRect();
      const PAD = 12;
      let top = gearRect.bottom + 4;
      let right = window.innerWidth - gearRect.right;
      const maxTop = window.innerHeight - popoverRect.height - PAD;
      if (top > maxTop) top = Math.max(PAD, maxTop);
      const maxRight = window.innerWidth - popoverRect.width - PAD;
      if (right < PAD) right = PAD;
      if (right > maxRight) right = Math.max(PAD, maxRight);
      setPopoverPos({ top, right });
    };
    compute();
    const raf = requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [settingsOpen]);

  // Click-outside
  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (settingsRef.current?.contains(target)) return;
      if (gearRef.current?.contains(target)) return;
      setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [settingsOpen]);

  const accent = style.headerColor;
  const cssVars: React.CSSProperties = {
    ['--content-scale' as string]: TEXT_SIZE_VAR[style.contentTextSize || 'md'],
    ['--widget-primary-text' as string]: style.contentTextColor || 'var(--text-primary)',
    ['--widget-tertiary-text' as string]: style.subtitleColor || 'var(--text-tertiary)',
  };

  const fakeWidget: WidgetConfig = {
    id: cardId,
    type: 'kpi-open-deals' as WidgetType,
    size: { cols: 2, rows: 2 },
    headerColor: style.headerColor,
    iconName: style.iconName,
    iconColor: style.iconColor,
    titleColor: style.titleColor,
    titleSize: style.titleSize,
    contentTextColor: style.contentTextColor,
    contentTextSize: style.contentTextSize,
    subtitleColor: style.subtitleColor,
    subtitleSize: style.subtitleSize,
    contentAlign: style.contentAlign,
  };

  return (
    <div
      ref={setDragRef}
      {...attributes}
      {...listeners}
      className={`group/kcard relative bg-[var(--surface-card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--brand-primary)] transition-colors ${
        isDragging ? 'opacity-30' : ''
      }`}
      style={cssVars}
    >
      {accent && <div className="h-1" style={{ background: accent }} />}

      {/* Gear icon overlay — visible on hover */}
      <button
        ref={gearRef}
        onClick={(e) => { e.stopPropagation(); setDragOffset({ x: 0, y: 0 }); setSettingsOpen((v) => !v); }}
        aria-label="Card settings"
        className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center bg-[var(--surface-card)]/90 backdrop-blur-sm border border-[var(--border)] cursor-pointer transition-all ${
          settingsOpen
            ? 'text-[var(--brand-primary)] opacity-100'
            : 'opacity-0 group-hover/kcard:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]'
        }`}
      >
        <Gear size={12} weight={settingsOpen ? 'fill' : 'bold'} />
      </button>

      <button
        onClick={() => onOpen(deal.id)}
        className="w-full px-3 py-2.5 text-left bg-transparent border-none cursor-pointer"
      >
        {/* Lead-in: the person this deal is with */}
        <div className="flex items-center gap-2 mb-2">
          {person ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0" style={{ background: getAvatarColor(person.id, person.avatarColor) }}>
              {initials(person.name)}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[calc(12px*var(--content-scale,1))] font-bold text-[var(--widget-primary-text)] truncate">{person?.name || 'Unknown contact'}</div>
            <div className="flex items-center gap-1 text-[calc(10px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] truncate">
              {org && (
                <span className="w-3 h-3 rounded-[2px] flex-shrink-0" style={{ background: getAvatarColor(org.id, org.avatarColor) }} />
              )}
              <span className="truncate">{org?.name || '—'}</span>
            </div>
          </div>
          <span className="text-[calc(11px*var(--content-scale,1))] font-extrabold text-[var(--widget-primary-text)] whitespace-nowrap flex-shrink-0">{fmtMoney(deal.amount)}</span>
        </div>
        {/* Deal / role */}
        <div className="text-[calc(11px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] leading-tight line-clamp-2 pl-10">{deal.name}</div>
      </button>

      {/* Show More toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        className="w-full px-3 py-1.5 text-[10px] font-bold text-[var(--brand-primary)] bg-transparent border-none border-t border-[var(--border-subtle)] cursor-pointer flex items-center justify-center gap-1 hover:bg-[var(--brand-bg)]"
      >
        {expanded ? <CaretDown size={10} weight="bold" /> : <CaretRight size={10} weight="bold" />}
        {expanded ? 'Show Less' : 'Show More'}
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex flex-col gap-1 text-[10px] text-[var(--text-secondary)]">
          <Row label="Probability" value={`${deal.probability}%`} />
          <Row label="Source" value={deal.source} />
          <Row label="Close" value={fmtDate(deal.expectedCloseDate)} />
          <Row label="Owner" value={deal.owner} />
          {deal.notes && (
            <div className="mt-1 pt-1 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)] line-clamp-3">{deal.notes}</div>
          )}
        </div>
      )}

      {/* Portal: Edit Card settings popover */}
      {settingsOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={settingsRef}
            style={{
              position: 'fixed',
              top: popoverPos?.top ?? -9999,
              right: popoverPos?.right ?? 0,
              zIndex: 100,
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
              visibility: popoverPos ? 'visible' : 'hidden',
            }}
          >
            <WidgetSettingsPopover
              widget={fakeWidget}
              widgetType={'kpi-open-deals' as WidgetType}
              title={person?.name || deal.name}
              onClose={() => setSettingsOpen(false)}
              onRemove={() => setSettingsOpen(false)}
              onStyleChange={(patch) => setStyle(cardId, patch as Partial<CardStyle>)}
              onDragStart={(e) => {
                e.preventDefault();
                const startX = e.clientX - dragOffset.x;
                const startY = e.clientY - dragOffset.y;
                document.body.style.cursor = 'grabbing';
                const onMove = (ev: MouseEvent) => {
                  setDragOffset({ x: ev.clientX - startX, y: ev.clientY - startY });
                };
                const onUp = () => {
                  document.body.style.cursor = '';
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)] truncate">{value}</span>
    </div>
  );
}
