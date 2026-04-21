'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gear } from '@phosphor-icons/react';
import { useCardStyleStore, CardStyle } from '@/stores/card-style-store';
import WidgetSettingsPopover from '@/components/dashboard/WidgetSettingsPopover';
import { WidgetConfig, WidgetType } from '@/types/dashboard';

export const CARD_TEXT_SIZE_VAR: Record<string, string> = {
  sm: '0.85', md: '1', lg: '1.15', xl: '1.35', xxl: '1.6',
};

// Shared empty-style reference — prevents infinite re-renders from selectors
// that fall back to a new `{}` each call.
const EMPTY_INLINE_STYLE: CardStyle = {};

interface Props {
  cardId: string;
  title: string;
  defaultIconName?: string;
  /** Position of the gear icon. Default: top-right corner. */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Drop this inside any card to add a gear icon + Edit Card popover.
 * The card container needs `position: relative` and `group/icard` class.
 * Style vars are written to card-style-store and should be read by the
 * parent using useCardSettings() for CSS var application.
 */
export default function InlineCardSettings({ cardId, title, defaultIconName = 'File', position = 'top-right' }: Props) {
  // Subscribe by key so zustand only re-renders when THIS card's style changes
  // (not every card on the page), and return a stable reference for missing keys.
  const style = useCardStyleStore((s) => s.styles[cardId]) || EMPTY_INLINE_STYLE;
  const setStyle = useCardStyleStore((s) => s.setStyle);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const gearRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !gearRef.current || !popoverRef.current) return;
    const compute = () => {
      const gearRect = gearRef.current!.getBoundingClientRect();
      const popoverRect = popoverRef.current!.getBoundingClientRect();
      const PAD = 12;
      let top = gearRect.bottom + 4;
      let right = window.innerWidth - gearRect.right;
      const maxTop = window.innerHeight - popoverRect.height - PAD;
      if (top > maxTop) top = Math.max(PAD, maxTop);
      const maxRight = window.innerWidth - popoverRect.width - PAD;
      if (right < PAD) right = PAD;
      if (right > maxRight) right = Math.max(PAD, maxRight);
      setPos({ top, right });
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (gearRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

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

  const positionClasses = {
    'top-right': 'top-1.5 right-1.5',
    'top-left': 'top-1.5 left-1.5',
    'bottom-right': 'bottom-1.5 right-1.5',
    'bottom-left': 'bottom-1.5 left-1.5',
  }[position];

  return (
    <>
      <button
        ref={gearRef}
        onClick={(e) => { e.stopPropagation(); setDragOffset({ x: 0, y: 0 }); setOpen((v) => !v); }}
        aria-label="Edit card"
        className={`absolute ${positionClasses} z-10 w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center bg-[var(--surface-card)] border border-[var(--border)] cursor-pointer transition-all ${
          open
            ? 'text-[var(--brand-primary)] opacity-100 bg-[var(--brand-bg)]'
            : 'text-[var(--text-tertiary)] opacity-60 hover:opacity-100 hover:text-[var(--brand-primary)] hover:bg-[var(--surface-raised)]'
        }`}
      >
        <Gear size={12} weight={open ? 'fill' : 'bold'} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            right: pos?.right ?? 0,
            zIndex: 100,
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          <WidgetSettingsPopover
            widget={fakeWidget}
            widgetType={'kpi-open-deals' as WidgetType}
            title={title}
            onClose={() => setOpen(false)}
            onRemove={() => setOpen(false)}
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
    </>
  );
}

/** Hook: read the card-style CSS vars for a given card ID. Apply via style prop. */
export function useCardStyleVars(cardId: string): React.CSSProperties {
  const style = useCardStyleStore((s) => s.styles[cardId]) || EMPTY_INLINE_STYLE;
  return {
    ['--content-scale' as string]: CARD_TEXT_SIZE_VAR[style.contentTextSize || 'md'],
    ['--widget-primary-text' as string]: style.contentTextColor || 'var(--text-primary)',
    ['--widget-tertiary-text' as string]: style.subtitleColor || 'var(--text-tertiary)',
    ['--widget-title-scale' as string]: CARD_TEXT_SIZE_VAR[style.titleSize || 'md'],
    ['--widget-title-color' as string]: style.titleColor || 'var(--text-primary)',
    ['--widget-subtitle-scale' as string]: CARD_TEXT_SIZE_VAR[style.subtitleSize || 'md'],
  };
}

/** Hook: get just the header color (for the accent stripe). */
export function useCardHeaderColor(cardId: string): string | undefined {
  return useCardStyleStore((s) => s.styles[cardId]?.headerColor);
}
