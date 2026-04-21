'use client';

import { useMemo } from 'react';
import { WidgetConfig } from '@/types/dashboard';
import { useSalesStore } from '@/stores/sales-store';
import { DEAL_SOURCES, DealSource } from '@/types/deal';
import Widget from '../Widget';

const SOURCE_COLORS: Record<DealSource, string> = {
  Inbound: '#1955A6',
  Outbound: '#0E7490',
  Referral: '#059669',
  Event: '#D97706',
  Partner: '#7C3AED',
  Marketing: '#BE185D',
};

export default function DealsBySourceWidget({ widget }: { widget: WidgetConfig }) {
  const deals = useSalesStore((s) => s.deals);

  const rows = useMemo(() => {
    return DEAL_SOURCES.map((source) => ({
      source,
      count: deals.filter((d) => d.source === source).length,
    })).filter((r) => r.count > 0);
  }, [deals]);

  const total = rows.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <Widget
      widget={widget}
      title={widget.title || 'Deals by source'}
      defaultIconName="ChartPieSlice"
    >
      {rows.length === 0 ? (
        <div className="text-[12px] italic text-[var(--widget-tertiary-text)] flex items-center justify-center h-full">
          No deal data yet
        </div>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="h-3 @md:h-4 @xl:h-6 w-full rounded-full overflow-hidden flex mb-3 @md:mb-4 @xl:mb-5">
            {rows.map((r) => (
              <div
                key={r.source}
                title={`${r.source}: ${r.count}`}
                style={{ width: `${(r.count / total) * 100}%`, background: SOURCE_COLORS[r.source] }}
              />
            ))}
          </div>
          {/* Legend */}
          <ul className="flex flex-col gap-1 @md:gap-1.5 @xl:gap-2">
            {rows.map((r) => (
              <li key={r.source} className="flex items-center gap-1.5 @md:gap-2 @xl:gap-3 text-[calc(11px*var(--content-scale,1))] @md:text-[calc(12px*var(--content-scale,1))] @xl:text-[calc(14px*var(--content-scale,1))]">
                <span className="w-2 h-2 @md:w-2.5 @md:h-2.5 @xl:w-3 @xl:h-3 rounded-full flex-shrink-0" style={{ background: SOURCE_COLORS[r.source] }} />
                <span className="text-[var(--widget-primary-text)] font-semibold flex-1">{r.source}</span>
                <span className="text-[var(--widget-tertiary-text)]">{r.count} · {Math.round((r.count / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  );
}
