'use client';

import { useMemo } from 'react';
import { WidgetConfig, WidgetType } from '@/types/dashboard';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import Widget from '../Widget';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const KPI_META: Record<string, { label: string; defaultIconName: string }> = {
  'kpi-open-deals':           { label: 'Open deals',          defaultIconName: 'Handbag' },
  'kpi-pipeline-value':       { label: 'Pipeline (weighted)', defaultIconName: 'TrendUp' },
  'kpi-won-this-month':       { label: 'Won this month',      defaultIconName: 'Trophy' },
  'kpi-stalled-deals':        { label: 'Stalled 21+ days',    defaultIconName: 'Warning' },
  'kpi-active-contacts':      { label: 'Active contacts',     defaultIconName: 'UsersThree' },
  'kpi-incomplete-contacts':  { label: 'Incomplete',          defaultIconName: 'Sparkle' },
  'kpi-win-rate':             { label: 'Win rate',            defaultIconName: 'ChartLineUp' },
  'kpi-avg-deal-size':        { label: 'Avg deal size',       defaultIconName: 'CurrencyDollar' },
  'kpi-avg-velocity':         { label: 'Avg velocity',        defaultIconName: 'Clock' },
  'kpi-lost-revenue':         { label: 'Lost revenue',        defaultIconName: 'Warning' },
  'kpi-total-revenue':        { label: 'Total revenue',       defaultIconName: 'CurrencyDollar' },
  'kpi-deals-count':          { label: 'Total deals',         defaultIconName: 'Handbag' },
};

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

export default function KPIWidget({ widget }: { widget: WidgetConfig }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);

  const { label, defaultIconName } = KPI_META[widget.type] || { label: 'KPI', defaultIconName: 'Sparkle' };

  const { value, subtitle } = useMemo(() => {
    switch (widget.type as WidgetType) {
      case 'kpi-open-deals': {
        const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
        return { value: String(open.length), subtitle: `${deals.length} total` };
      }
      case 'kpi-pipeline-value': {
        const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
        const weighted = open.reduce((s, d) => s + (d.amount * d.probability) / 100, 0);
        const total = open.reduce((s, d) => s + d.amount, 0);
        return { value: fmtMoney(weighted), subtitle: `${fmtMoney(total)} unweighted` };
      }
      case 'kpi-won-this-month': {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const won = deals.filter((d) => {
          if (d.stage !== 'closed-won' || !d.closedAt) return false;
          const cd = new Date(d.closedAt);
          return cd.getMonth() === month && cd.getFullYear() === year;
        });
        const sum = won.reduce((s, d) => s + d.amount, 0);
        return { value: String(won.length), subtitle: fmtMoney(sum) };
      }
      case 'kpi-stalled-deals': {
        const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
        const stalled = open.filter((d) => {
          const days = (Date.now() - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
          return days > 21;
        });
        return { value: String(stalled.length), subtitle: stalled.length === 0 ? 'All moving' : 'needs attention' };
      }
      case 'kpi-active-contacts': {
        const active = contacts.filter((c) => c.status === 'active');
        return { value: String(active.length), subtitle: `${contacts.length} total` };
      }
      case 'kpi-incomplete-contacts': {
        const stale = contacts.filter((c) => c.stale);
        return { value: String(stale.length), subtitle: stale.length === 0 ? 'All complete' : 'needs review' };
      }
      case 'kpi-win-rate': {
        const won = deals.filter((d) => d.stage === 'closed-won');
        const lost = deals.filter((d) => d.stage === 'closed-lost');
        const rate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
        return { value: `${rate}%`, subtitle: `${won.length} won · ${lost.length} lost` };
      }
      case 'kpi-avg-deal-size': {
        const won = deals.filter((d) => d.stage === 'closed-won');
        const avg = won.length > 0 ? won.reduce((s, d) => s + d.amount, 0) / won.length : 0;
        return { value: fmtMoney(avg), subtitle: `from ${won.length} closed deals` };
      }
      case 'kpi-avg-velocity': {
        const won = deals.filter((d) => d.stage === 'closed-won');
        const velocities = won.map((d) => {
          const c = new Date(d.createdAt).getTime();
          const cl = new Date(d.closedAt || d.lastUpdated).getTime();
          return Math.max(1, Math.round((cl - c) / (1000 * 60 * 60 * 24)));
        });
        const avg = velocities.length > 0 ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0;
        return { value: `${avg}d`, subtitle: 'avg days to close' };
      }
      case 'kpi-lost-revenue': {
        const lost = deals.filter((d) => d.stage === 'closed-lost');
        const sum = lost.reduce((s, d) => s + d.amount, 0);
        return { value: fmtMoney(sum), subtitle: `${lost.length} deals lost` };
      }
      case 'kpi-total-revenue': {
        const won = deals.filter((d) => d.stage === 'closed-won');
        const sum = won.reduce((s, d) => s + d.amount, 0);
        return { value: fmtMoney(sum), subtitle: `${won.length} placements` };
      }
      case 'kpi-deals-count': {
        return { value: String(deals.length), subtitle: `${contacts.length} contacts` };
      }
      default:
        return { value: '—', subtitle: '' };
    }
  }, [deals, contacts, widget.type]);

  // Hero number: scales with container size via container queries, AND multiplies
  // by --content-scale (set on the Widget wrapper from contentTextSize).
  return (
    <Widget widget={widget} title={widget.title || label} defaultIconName={defaultIconName}>
      <div className="flex flex-col justify-center h-full">
        <AnimatedCounter
          value={value}
          className="text-[calc(28px*var(--content-scale,1))] @sm:text-[calc(32px*var(--content-scale,1))] @md:text-[calc(44px*var(--content-scale,1))] @lg:text-[calc(56px*var(--content-scale,1))] @xl:text-[calc(72px*var(--content-scale,1))] @3xl:text-[calc(88px*var(--content-scale,1))] font-extrabold leading-none tracking-tight text-[var(--widget-primary-text)] block"
        />
        {subtitle && (
          <div className="text-[calc(10px*var(--widget-subtitle-scale,1))] @md:text-[calc(12px*var(--widget-subtitle-scale,1))] @lg:text-[calc(13px*var(--widget-subtitle-scale,1))] @xl:text-[calc(14px*var(--widget-subtitle-scale,1))] text-[var(--widget-tertiary-text)] mt-1.5 @md:mt-2 @lg:mt-3 font-semibold">
            {subtitle}
          </div>
        )}
      </div>
    </Widget>
  );
}
