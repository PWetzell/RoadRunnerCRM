'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gear, DotsSixVertical, ArrowsOutSimple } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetConfig, WidgetType } from '@/types/dashboard';
import { useDashboardStore } from '@/stores/dashboard-store';
import { getIcon } from '@/lib/phosphor-icons';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import WidgetSettingsPopover from './WidgetSettingsPopover';
import { useWidgetStoreActionsOptional } from './WidgetStoreContext';

interface Props {
  widget: WidgetConfig;
  title: string;
  /** Default Phosphor icon name for the widget type — used unless overridden by widget.iconName. */
  defaultIconName: string;
  children: React.ReactNode;
}

const COL_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
};
const ROW_CLASS: Record<1 | 2 | 3, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

const TEXT_SIZE_VAR = {
  sm:  '0.85',
  md:  '1',
  lg:  '1.15',
  xl:  '1.35',
  xxl: '1.6',
} as const;

const SIZE_PRESETS: { cols: 1 | 2 | 3 | 4; rows: 1 | 2 | 3; label: string; shortLabel: string }[] = [
  { cols: 1, rows: 1, label: 'Compact', shortLabel: 'S' },
  { cols: 2, rows: 2, label: 'Medium',  shortLabel: 'M' },
  { cols: 4, rows: 2, label: 'Wide',    shortLabel: 'W' },
];

/** Approximate grid cell sizes — used to translate drag pixels to col/row spans. */
const GRID_COL_PX = 280;
const GRID_ROW_PX = 170; // ~160px auto-row + gap

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Widget({ widget, title, defaultIconName, children }: Props) {
  // Use context store actions if provided (Reporting/Admin dashboards),
  // otherwise fall back to the main dashboard store.
  const ctxActions = useWidgetStoreActionsOptional();
  const _removeWidget = useDashboardStore((s) => s.removeWidget);
  const _resizeWidget = useDashboardStore((s) => s.resizeWidget);
  const removeWidget = ctxActions?.removeWidget ?? _removeWidget;
  const resizeWidget = ctxActions?.resizeWidget ?? _resizeWidget;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLButtonElement>(null);

  // Position the popover so it ALWAYS fits fully on screen — no scroll, no
  // clipping. Strategy: try to anchor below the gear button; if that would
  // overflow the viewport, slide UP just enough to fit. Same for horizontal
  // bounds. Popover's own intrinsic dimensions drive the clamp.
  useLayoutEffect(() => {
    if (!settingsOpen || !gearRef.current || !settingsRef.current) return;
    const compute = () => {
      const gearRect = gearRef.current!.getBoundingClientRect();
      const popoverRect = settingsRef.current!.getBoundingClientRect();
      const PAD = 12;
      // Default: 4px below the gear, right-aligned to it
      let top = gearRect.bottom + 4;
      let right = window.innerWidth - gearRect.right;
      // Vertical clamp: keep top ≥ PAD and (top + height) ≤ viewport - PAD
      const maxTop = window.innerHeight - popoverRect.height - PAD;
      if (top > maxTop) top = Math.max(PAD, maxTop);
      // Horizontal clamp: keep right ≥ PAD (so popover's left isn't off-screen)
      const minRight = PAD;
      const maxRight = window.innerWidth - popoverRect.width - PAD;
      if (right < minRight) right = minRight;
      if (right > maxRight) right = Math.max(minRight, maxRight);
      setPopoverPos({ top, right });
    };
    // Compute twice: once with current size, once after the popover renders
    // its real intrinsic dimensions.
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

  // Click-outside: anywhere outside the gear button OR the portaled popover closes it.
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

  // Drag is always available — no global Customize toggle. Settings open
  // disables drag so we don't dismiss the popover on accidental drag-start.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: settingsOpen,
  });

  // CSS-var contract — 3 text tiers: title, value, subtitle.
  //
  //   TITLE (widget header):
  //     --widget-title-color   : header title color
  //     --widget-title-scale   : header title size multiplier
  //
  //   VALUE (primary content — KPI number, list item name, etc.):
  //     --content-scale        : value size multiplier (also aliased for compat)
  //     --widget-primary-text  : value color
  //     --widget-secondary-text: derived muted variant
  //
  //   SUBTITLE (secondary content — KPI subtitle, list item description, etc.):
  //     --widget-subtitle-scale: subtitle size multiplier
  //     --widget-tertiary-text : subtitle color
  //
  // Widgets reference these vars instead of raw tokens so user-picked
  // colors actually cascade into the content.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    // Title
    ['--widget-title-color' as string]: widget.titleColor || 'var(--text-primary)',
    ['--widget-title-scale' as string]: TEXT_SIZE_VAR[widget.titleSize || 'md'],
    // Value
    ['--content-scale' as string]: TEXT_SIZE_VAR[widget.contentTextSize || 'md'],
    ['--widget-primary-text' as string]: widget.contentTextColor || 'var(--text-primary)',
    ['--widget-secondary-text' as string]: widget.contentTextColor
      ? `color-mix(in srgb, ${widget.contentTextColor} 75%, var(--surface-card))`
      : 'var(--text-secondary)',
    // Subtitle
    ['--widget-subtitle-scale' as string]: TEXT_SIZE_VAR[widget.subtitleSize || 'md'],
    ['--widget-tertiary-text' as string]: widget.subtitleColor || (widget.contentTextColor
      ? `color-mix(in srgb, ${widget.contentTextColor} 55%, var(--surface-card))`
      : 'var(--text-tertiary)'),
  };

  const accent = widget.headerColor;
  const iconColor = widget.iconColor || accent;

  // Resolve the icon: widget.iconName overrides the default.
  const Icon = getIcon(widget.iconName) || getIcon(defaultIconName);

  const align = widget.contentAlign || 'left';

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`@container relative group/widget ${COL_CLASS[widget.size.cols]} ${ROW_CLASS[widget.size.rows]} bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col transition-colors hover:border-[var(--border-strong)]`}
    >
      {accent && <div className="h-1 flex-shrink-0" style={{ background: accent }} aria-hidden />}
      <header
        className="px-3 py-2 @md:px-4 @md:py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0"
        style={accent ? { background: `color-mix(in srgb, ${accent} 8%, transparent)` } : undefined}
      >
        {/* Always-visible drag handle (subtle until hover) */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="opacity-30 group-hover/widget:opacity-100 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] cursor-grab active:cursor-grabbing bg-transparent border-none p-0.5 transition-opacity"
        >
          <DotsSixVertical size={16} weight="bold" />
        </button>

        {Icon && (
          <Icon size={14} weight="duotone" style={{ color: iconColor || 'var(--text-secondary)' }} />
        )}

        <span className="text-[calc(12px*var(--widget-title-scale,1))] @md:text-[calc(13px*var(--widget-title-scale,1))] @xl:text-[calc(14px*var(--widget-title-scale,1))] font-extrabold text-[var(--widget-title-color)] truncate flex-1">
          {title}
        </span>

        {/* Size presets — appear on hover, secondary-styled segmented group.
            Active preset is outlined in brand; other presets are neutral. */}
        <div data-tour="widget-size-pills" className="opacity-0 group-hover/widget:opacity-100 transition-opacity flex items-center gap-0.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full p-0.5">
          {SIZE_PRESETS.map((p) => {
            const active = widget.size.cols === p.cols && widget.size.rows === p.rows;
            return (
              <button
                key={p.label}
                onClick={() => resizeWidget(widget.id, { cols: p.cols, rows: p.rows })}
                aria-label={p.label}
                title={p.label}
                className={`w-5 h-5 rounded-full text-[9px] font-extrabold cursor-pointer border-none transition-colors ${
                  active
                    ? 'bg-[var(--brand-bg)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                    : 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]'
                }`}
              >
                {p.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Per-widget settings — popover is portaled to <body> below to escape
            the card's overflow:hidden clipping. */}
        <button
          ref={gearRef}
          data-tour="widget-settings"
          aria-label="Widget settings"
          className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center bg-transparent border-none cursor-pointer transition-all ${
            settingsOpen
              ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]'
              : 'opacity-50 group-hover/widget:opacity-100 text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--brand-primary)]'
          }`}
          onClick={() => { setDragOffset({ x: 0, y: 0 }); setSettingsOpen((v) => !v); }}
        >
          <Gear size={14} weight={settingsOpen ? 'fill' : 'bold'} />
        </button>
      </header>

      <div className={`flex-1 px-3 py-2.5 @md:px-4 @md:py-3 @xl:px-5 @xl:py-4 overflow-auto ${ALIGN_CLASS[align]}`}>
        {children}
      </div>

      {/* Drag-to-resize corner handle. Subtly visible on hover, becomes
          fully opaque while resizing. Converts pixel deltas (plus any
          auto-scroll that happened during the drag) to grid spans. */}
      <button
        aria-label="Resize widget"
        title="Drag to resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startCols = widget.size.cols;
          const startRows = widget.size.rows;

          // Find the nearest scrollable ancestor (the dashboard's scroll
          // container) so we can auto-scroll when the cursor approaches
          // its edges and adjust the row delta for whatever scroll happens.
          let scrollEl: HTMLElement | null = (e.currentTarget as HTMLElement).parentElement;
          while (scrollEl) {
            const oy = getComputedStyle(scrollEl).overflowY;
            if (oy === 'auto' || oy === 'scroll') break;
            scrollEl = scrollEl.parentElement;
          }
          const startScrollTop = scrollEl?.scrollTop ?? 0;

          // CRITICAL: when the dashboard is already scrolled to the bottom,
          // there's no room left to auto-scroll into — so the user has no
          // way to drag past the viewport edge. Temporarily extend the
          // scrollable area with bottom padding for the duration of the
          // drag, then restore it on mouseup.
          const originalPaddingBottom = scrollEl?.style.paddingBottom ?? '';
          if (scrollEl) scrollEl.style.paddingBottom = '600px';

          setResizing(true);
          document.body.style.cursor = 'nwse-resize';

          // Track latest cursor coords so the auto-scroll loop has fresh values.
          let lastClientX = startX;
          let lastClientY = startY;
          let scrollTimer: number | null = null;
          let scrollDir: -1 | 0 | 1 = 0;

          const applyResize = () => {
            const scrollDy = (scrollEl?.scrollTop ?? 0) - startScrollTop;
            const dCols = Math.round((lastClientX - startX) / GRID_COL_PX);
            const dRows = Math.round((lastClientY - startY + scrollDy) / GRID_ROW_PX);
            const newCols = clamp(startCols + dCols, 1, 4) as 1 | 2 | 3 | 4;
            const newRows = clamp(startRows + dRows, 1, 3) as 1 | 2 | 3;
            resizeWidget(widget.id, { cols: newCols, rows: newRows });
          };

          const onMove = (ev: MouseEvent) => {
            lastClientX = ev.clientX;
            lastClientY = ev.clientY;

            // Auto-scroll when cursor is near top/bottom edges of the
            // dashboard scroll container.
            if (scrollEl) {
              const rect = scrollEl.getBoundingClientRect();
              const ZONE = 60;
              let dir: -1 | 0 | 1 = 0;
              if (ev.clientY > rect.bottom - ZONE) dir = 1;
              else if (ev.clientY < rect.top + ZONE) dir = -1;
              if (dir !== scrollDir) {
                if (scrollTimer) {
                  clearInterval(scrollTimer);
                  scrollTimer = null;
                }
                scrollDir = dir;
                if (dir !== 0) {
                  const SPEED = 14;
                  scrollTimer = window.setInterval(() => {
                    scrollEl!.scrollBy(0, SPEED * dir);
                    applyResize(); // keep resize in sync as we scroll
                  }, 16);
                }
              }
            }

            applyResize();
          };
          const onUp = () => {
            setResizing(false);
            document.body.style.cursor = '';
            if (scrollTimer) {
              clearInterval(scrollTimer);
              scrollTimer = null;
            }
            // Restore original scroll-container padding so the page snaps
            // back to its natural height after resize ends.
            if (scrollEl) scrollEl.style.paddingBottom = originalPaddingBottom;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
        className={`absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center rounded-[var(--radius-sm)] cursor-nwse-resize bg-transparent border-none transition-opacity ${
          resizing
            ? 'opacity-100 text-[var(--brand-primary)] bg-[var(--brand-bg)]'
            : 'opacity-0 group-hover/widget:opacity-70 hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]'
        }`}
      >
        <ArrowsOutSimple size={12} weight="bold" style={{ transform: 'rotate(90deg)' }} />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove widget?"
        message={<>Remove <strong>{title}</strong> from this dashboard? You can add it back later from the widget menu.</>}
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmOpen(false);
          removeWidget(widget.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Portal: settings popover renders at <body> to avoid being clipped
          by the card's overflow:hidden. Positioned via fixed coordinates
          calculated from the gear button's bounding rect. */}
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
              widget={widget}
              widgetType={widget.type as WidgetType}
              title={title}
              onClose={() => setSettingsOpen(false)}
              onRemove={() => setConfirmOpen(true)}
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
    </section>
  );
}
