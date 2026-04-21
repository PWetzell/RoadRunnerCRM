'use client';

import { useMemo } from 'react';
import { Sparkle, TrendUp, ChartLineUp, Warning } from '@phosphor-icons/react';
import { useSalesStore } from '@/stores/sales-store';

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

export default function SalesInsightsBar() {
  const deals = useSalesStore((s) => s.deals);

  const stats = useMemo(() => {
    const openDeals = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
    const weighted = openDeals.reduce((sum, d) => sum + (d.amount * d.probability) / 100, 0);
    const totalOpen = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const won = deals.filter((d) => d.stage === 'closed-won');
    const wonAmount = won.reduce((sum, d) => sum + d.amount, 0);
    const stalled = openDeals.filter((d) => {
      const days = (Date.now() - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      return days > 14;
    });
    return { openCount: openDeals.length, weighted, totalOpen, wonAmount, stalledCount: stalled.length };
  }, [deals]);

  return (
    <div data-tour="sales-insights" className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
      <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={13} weight="duotone" className="text-white" />
      </div>
      <div className="text-[13px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">AI Pipeline Forecast</strong>
        <span> · {stats.openCount} open deals</span>
      </div>
      <div className="flex gap-1.5 flex-wrap ml-1">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
          <TrendUp size={12} weight="fill" /> {fmtMoney(stats.weighted)} weighted forecast
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--brand-bg)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
          <ChartLineUp size={12} weight="fill" /> {fmtMoney(stats.totalOpen)} total open
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${stats.stalledCount > 0 ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]' : 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]'}`}>
          <Warning size={12} weight="fill" /> {stats.stalledCount > 0 ? `${stats.stalledCount} stalled (14+ days)` : 'All moving'}
        </span>
      </div>
    </div>
  );
}
