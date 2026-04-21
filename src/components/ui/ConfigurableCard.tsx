'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gear } from '@phosphor-icons/react';
import { useCardStyleStore, CardStyle } from '@/stores/card-style-store';

const EMPTY_CARD_STYLE: CardStyle = {};
import { getIcon } from '@/lib/phosphor-icons';
import WidgetSettingsPopover from '@/components/dashboard/WidgetSettingsPopover';
import { WidgetConfig, WidgetType } from '@/types/dashboard';

interface Props {
  /** Stable ID used to persist style overrides (e.g., "kanban-deal-1"). */
  cardId: string;
  /** Display title shown in the card header + Edit dialog. */
  title: string;
  /** Default Phosphor icon name. Overridden by user's icon pick. */
  defaultIconName?: string;
  /** Card body. */
  children: React.ReactNode;
  /** Extra header content (badges, counts, etc.) inserted before the gear. */
  headerExtra?: React.ReactNode;
  /** Optional className on the outer wrapper. */
  className?: string;
}

const TEXT_SIZE_VAR: Record<string, string> = {
  sm: '0.85', md: '1', lg: '1.15', xl: '1.35', xxl: '1.6',
};

/**
 * A card wrapper that gives any content the same Edit Card gear-icon
 * customization as dashboard widgets: header color, icon, text colors/sizes,
 * alignment. Uses the card-style-store for persistence (separate from the
 * dashboard widget store so these work on kanban cards, report sections, etc.).
 *
 * The settings popover is the same WidgetSettingsPopover used by dashboard
 * widgets — it accepts a WidgetConfig-shaped object and writes back via
 * callbacks. We bridge card-style-store ↔ WidgetConfig at the boundary.
 */
export default function ConfigurableCard({ cardId, title, defaultIconName = 'File', children, headerExtra, className = '' }: Props) {
  // Subscribe to this card's slot directly so we only re-render when this
  // card's style changes (not every card on the page).
  const style = useCardStyleStore((s) => s.styles[cardId]) || EMPTY_CARD_STYLE;
  const setStyle = useCardStyleStore((s) => s.setStyle);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const gearRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Position the popover
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
  const iconColor = style.iconColor || accent;
  const Icon = getIcon(style.iconName) || getIcon(defaultIconName);

  // Bridge: card-style-store → fake WidgetConfig for the popover
  const fakeWidget: WidgetConfig = {
    id: cardId,
    type: 'kpi-open-deals' as WidgetType, // not used for rendering, just for icon suggestions
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

  // CSS vars for text styling
  const cssVars: React.CSSProperties = {
    ['--widget-title-color' as string]: style.titleColor || 'var(--text-primary)',
    ['--widget-title-scale' as string]: TEXT_SIZE_VAR[style.titleSize || 'md'],
    ['--content-scale' as string]: TEXT_SIZE_VAR[style.contentTextSize || 'md'],
    ['--widget-primary-text' as string]: style.contentTextColor || 'var(--text-primary)',
    ['--widget-secondary-text' as string]: style.contentTextColor
      ? `color-mix(in srgb, ${style.contentTextColor} 75%, var(--surface-card))`
      : 'var(--text-secondary)',
    ['--widget-subtitle-scale' as string]: TEXT_SIZE_VAR[style.subtitleSize || 'md'],
    ['--widget-tertiary-text' as string]: style.subtitleColor || (style.contentTextColor
      ? `color-mix(in srgb, ${style.contentTextColor} 55%, var(--surface-card))`
      : 'var(--text-tertiary)'),
  };

  const align = style.contentAlign || 'left';

  return (
    <div
      data-tour={cardId}
      className={`group/ccard bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col hover:border-[var(--border-strong)] transition-colors ${className}`}
      style={cssVars}
    >
      {accent && <div className="h-1 flex-shrink-0" style={{ background: accent }} />}
      <header
        className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0"
        style={accent ? { background: `color-mix(in srgb, ${accent} 8%, transparent)` } : undefined}
      >
        {Icon && <Icon size={14} weight="duotone" style={{ color: iconColor || 'var(--text-secondary)' }} />}
        <span
          className="text-[calc(12px*var(--widget-title-scale,1))] font-extrabold text-[var(--widget-title-color)] truncate flex-1"
        >
          {title}
        </span>
        {headerExtra}
        <button
          ref={gearRef}
          onClick={() => { setDragOffset({ x: 0, y: 0 }); setSettingsOpen((v) => !v); }}
          aria-label="Card settings"
          className={`w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center bg-transparent border-none cursor-pointer transition-all ${
            settingsOpen
              ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
              : 'opacity-0 group-hover/ccard:opacity-100 text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--brand-primary)]'
          }`}
        >
          <Gear size={12} weight={settingsOpen ? 'fill' : 'bold'} />
        </button>
      </header>
      <div className={`flex-1 px-3 py-2 text-${align}`}>{children}</div>

      {/* Portal: settings popover */}
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
              title={title}
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
