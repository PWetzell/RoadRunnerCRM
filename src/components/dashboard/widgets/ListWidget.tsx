'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { WidgetConfig, WidgetType, itemLimitForSize } from '@/types/dashboard';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { initials } from '@/lib/utils';
import Widget from '../Widget';

const LIST_META: Record<string, { label: string; defaultIconName: string }> = {
  'list-recent-deals':    { label: 'Recent deals',    defaultIconName: 'Handbag' },
  'list-recent-contacts': { label: 'Recent contacts', defaultIconName: 'UsersThree' },
  'list-stalled-deals':   { label: 'Needs attention', defaultIconName: 'Warning' },
};

/**
 * Avatar palette for visible-list cards (Recent deals, Recent contacts,
 * Needs attention). Cycled by INDEX so a 5–7 row visible window always
 * spans the full color spread — no clustering on a couple of hues.
 *
 * Why not the global getAvatarColor() hash: that's tuned for "same
 * person → same color across the app," which is right for a 100-row
 * grid where consistency wins. For a tiny dashboard widget the only
 * goal is visual variety. With hash-by-name, specific deal names
 * happened to map onto only a few palette buckets (slate / violet /
 * fuchsia / pink / orange) — no blue, no green visible.
 *
 * Trade-off: a deal's avatar color will change if its position in the
 * list changes (e.g. it gets bumped down by a more recent deal). For
 * a "Recent" feed sorted by date that's acceptable — variety wins
 * over per-row stability here.
 *
 * Sequence chosen so adjacent rows are visually distinct: blue → pink
 * → emerald → orange → violet → cyan → red → indigo → amber → teal →
 * fuchsia → slate. Each color WCAG AA against the white initials.
 */
const LIST_AVATAR_PALETTE = [
  '#1D4ED8', // blue-700
  '#BE185D', // pink-700
  '#047857', // emerald-700
  '#C2410C', // orange-700
  '#6D28D9', // violet-700
  '#0E7490', // cyan-700
  '#DC2626', // red-600
  '#4F46E5', // indigo-600
  '#B45309', // amber-700
  '#0F766E', // teal-700
  '#C026D3', // fuchsia-600
  '#475569', // slate-600
];

function avatarColorByIndex(i: number): string {
  return LIST_AVATAR_PALETTE[i % LIST_AVATAR_PALETTE.length];
}

export default function ListWidget({ widget }: { widget: WidgetConfig }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);

  const meta = LIST_META[widget.type] || { label: 'List', icon: null };

  // Compute the full source list + size-aware cap + "View all" link target.
  const { items, totalCount, viewAllHref, viewAllLabel } = useMemo(() => {
    const limit = itemLimitForSize(widget.size);
    switch (widget.type as WidgetType) {
      case 'list-recent-deals': {
        const all = [...deals].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        return {
          items: all.slice(0, limit).map((d) => ({
            href: `/sales/${d.id}`,
            title: d.name,
            subtitle: `${d.stage.replace('-', ' ')} · $${d.amount.toLocaleString()}`,
            avatarText: d.name.slice(0, 2).toUpperCase(),
          })),
          totalCount: all.length,
          viewAllHref: '/sales',
          viewAllLabel: 'View all deals',
        };
      }
      case 'list-recent-contacts': {
        const all = [...contacts].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        return {
          items: all.slice(0, limit).map((c) => ({
            href: `/contacts/${c.id}`,
            title: c.name,
            subtitle: c.type === 'person' ? (c as { title?: string }).title || 'Person' : (c as { industry?: string }).industry || 'Organization',
            avatarText: initials(c.name),
            isOrg: c.type === 'org',
          })),
          totalCount: all.length,
          viewAllHref: '/contacts',
          viewAllLabel: 'View all contacts',
        };
      }
      case 'list-stalled-deals': {
        const now = Date.now();
        const all = deals
          .filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost')
          .map((d) => ({
            deal: d,
            daysIdle: Math.floor((now - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)),
          }))
          .filter((x) => x.daysIdle > 14)
          .sort((a, b) => b.daysIdle - a.daysIdle);
        return {
          items: all.slice(0, limit).map((x) => ({
            href: `/sales/${x.deal.id}`,
            title: x.deal.name,
            subtitle: `${x.daysIdle} days idle · ${x.deal.stage.replace('-', ' ')}`,
            avatarText: x.deal.name.slice(0, 2).toUpperCase(),
          })),
          totalCount: all.length,
          viewAllHref: '/sales',
          viewAllLabel: 'View all stalled',
        };
      }
      default:
        return { items: [], totalCount: 0, viewAllHref: '', viewAllLabel: '' };
    }
  }, [deals, contacts, widget.type, widget.size]);

  const hasMore = totalCount > items.length;

  return (
    <Widget widget={widget} title={widget.title || meta.label} defaultIconName={meta.defaultIconName}>
      {items.length === 0 ? (
        <div className="text-[12px] italic text-[var(--widget-tertiary-text)] flex items-center justify-center h-full">
          Nothing to show yet
        </div>
      ) : (
        <div className="flex flex-col h-full relative">
          {/* List of items — overflow-hidden so when content exceeds
              the widget body, trailing items get cleanly clipped at
              the boundary above the footer. No internal scrollbar.
              flex-1 min-h-0 lets the list shrink within the widget. */}
          <ul className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {items.map((i, idx) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="flex items-center gap-2 @md:gap-2.5 @xl:gap-3 py-1.5 @md:py-2 @xl:py-2.5 px-1 hover:bg-[var(--surface-raised)] rounded-md no-underline"
                >
                  <div
                    className="w-6 h-6 @md:w-7 @md:h-7 @xl:w-8 @xl:h-8 flex items-center justify-center text-[9px] @md:text-[10px] @xl:text-[11px] font-extrabold text-white flex-shrink-0"
                    style={{
                      // Index-based color: every visible row uses the
                      // next color in LIST_AVATAR_PALETTE, guaranteeing
                      // a full spread across the visible window. See
                      // helper docstring for rationale vs hash-by-name.
                      background: avatarColorByIndex(idx),
                      borderRadius: ('isOrg' in i && i.isOrg) ? 'var(--radius-sm)' : 'var(--radius-full)',
                    }}
                  >
                    {i.avatarText}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[calc(11px*var(--content-scale,1))] @md:text-[calc(12px*var(--content-scale,1))] @xl:text-[calc(13px*var(--content-scale,1))] font-bold text-[var(--widget-primary-text)] truncate">{i.title}</div>
                    <div className="text-[calc(9px*var(--widget-subtitle-scale,1))] @md:text-[calc(10px*var(--widget-subtitle-scale,1))] @xl:text-[calc(11px*var(--widget-subtitle-scale,1))] text-[var(--widget-tertiary-text)] truncate">{i.subtitle}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* View all footer — pinned at the bottom of the card with
              flex-shrink-0 (never compresses) and a solid surface bg
              + z-10 so a partially-clipped row above can never bleed
              through. Previously the link rendered inline in flex
              flow without a background, which let the last item's
              text show through when the widget was shortened. */}
          {hasMore && viewAllHref && (
            <Link
              href={viewAllHref}
              className="flex-shrink-0 relative z-10 flex items-center justify-center gap-1 pt-2 mt-1 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] text-[10px] @md:text-[11px] font-bold text-[var(--brand-primary)] no-underline hover:underline"
            >
              {viewAllLabel} ({totalCount}) <ArrowRight size={10} weight="bold" />
            </Link>
          )}
        </div>
      )}
    </Widget>
  );
}
