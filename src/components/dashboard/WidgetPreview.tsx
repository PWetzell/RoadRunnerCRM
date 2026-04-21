'use client';

import { WidgetType } from '@/types/dashboard';
import {
  Handbag, TrendUp, Trophy, Warning, UsersThree, Sparkle, ChartLineUp, CurrencyDollar,
  Clock, ChartBar, ChartPieSlice, ListBullets, CheckSquare, MagicWand, Funnel,
} from '@phosphor-icons/react';
import { useCustomReportStore } from '@/stores/custom-report-store';

/**
 * Mini visual preview of a widget type — shown inside the Add Widget
 * picker so users know what they're about to add.
 *
 * Rendered at a fixed ~84×52 pixel thumbnail. Not interactive.
 */
export default function WidgetPreview({ type, reportId }: { type: WidgetType; reportId?: string }) {
  if (type.startsWith('kpi-')) return <KpiPreview type={type} />;
  if (type === 'chart-pipeline-by-stage') return <BarPreview />;
  if (type === 'chart-deals-by-source') return <PiePreview />;
  if (type.startsWith('list-')) return <ListPreview />;
  if (type === 'todo') return <TodoPreview />;
  if (type === 'ai-suggestions') return <AIPreview />;
  if (type === 'custom-report') return <CustomReportPreview reportId={reportId} />;
  return <DefaultPreview />;
}

const KPI_DEMO: Partial<Record<WidgetType, { value: string; accent: string; icon: typeof Handbag }>> = {
  'kpi-open-deals':          { value: '12',    accent: '#1955A6', icon: Handbag },
  'kpi-pipeline-value':      { value: '$269K', accent: '#0E7490', icon: TrendUp },
  'kpi-won-this-month':      { value: '3',     accent: '#059669', icon: Trophy },
  'kpi-stalled-deals':       { value: '2',     accent: '#DC2626', icon: Warning },
  'kpi-active-contacts':     { value: '47',    accent: '#5B21B6', icon: UsersThree },
  'kpi-incomplete-contacts': { value: '4',     accent: '#D97706', icon: Sparkle },
  'kpi-win-rate':            { value: '68%',   accent: '#A255FF', icon: ChartLineUp },
  'kpi-avg-deal-size':       { value: '$48K',  accent: '#D97706', icon: CurrencyDollar },
  'kpi-avg-velocity':        { value: '32d',   accent: '#0E7490', icon: Clock },
  'kpi-lost-revenue':        { value: '$75K',  accent: '#DC2626', icon: Warning },
  'kpi-total-revenue':       { value: '$412K', accent: '#059669', icon: CurrencyDollar },
  'kpi-deals-count':         { value: '14',    accent: '#1955A6', icon: Handbag },
};

function KpiPreview({ type }: { type: WidgetType }) {
  const data = KPI_DEMO[type] ?? KPI_DEMO['kpi-open-deals']!;
  const Icon = data.icon;
  return (
    <div
      className="w-[84px] h-[52px] rounded bg-white flex flex-col justify-between p-1.5 border border-[var(--border)] relative overflow-hidden"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-3.5 h-3.5 rounded flex items-center justify-center"
          style={{ background: `${data.accent}22` }}
        >
          <Icon size={9} weight="fill" style={{ color: data.accent }} />
        </div>
        <div className="h-1 w-6 rounded" style={{ background: `${data.accent}44` }} />
      </div>
      <div className="font-extrabold leading-none" style={{ color: data.accent, fontSize: 18 }}>
        {data.value}
      </div>
    </div>
  );
}

function BarPreview() {
  const bars = [
    { w: 80, c: '#1E293B' },
    { w: 65, c: '#0B2F5C' },
    { w: 50, c: '#5B21B6' },
    { w: 35, c: '#0E7490' },
    { w: 25, c: '#9D174D' },
  ];
  return (
    <div
      className="w-[84px] h-[52px] rounded bg-white flex flex-col justify-center gap-[2px] px-1.5 border border-[var(--border)]"
      aria-hidden="true"
    >
      {bars.map((b, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full" style={{ background: b.c }} />
          <div className="h-1 rounded" style={{ width: b.w + '%', background: b.c }} />
        </div>
      ))}
    </div>
  );
}

function PiePreview() {
  // Simple pie SVG with 4 slices
  return (
    <div
      className="w-[84px] h-[52px] rounded bg-white flex items-center justify-center border border-[var(--border)]"
      aria-hidden="true"
    >
      <svg width={40} height={40} viewBox="0 0 40 40">
        <circle cx={20} cy={20} r={16} fill="#1955A6" />
        <path d="M 20 20 L 20 4 A 16 16 0 0 1 34 24 Z" fill="#0E7490" />
        <path d="M 20 20 L 34 24 A 16 16 0 0 1 20 36 Z" fill="#059669" />
        <path d="M 20 20 L 20 36 A 16 16 0 0 1 6 18 Z" fill="#D97706" />
      </svg>
    </div>
  );
}

function ListPreview() {
  return (
    <div
      className="w-[84px] h-[52px] rounded bg-white flex flex-col justify-center gap-1 px-1.5 border border-[var(--border)]"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)] opacity-70 flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-[2px]">
            <div className="h-[3px] rounded bg-[var(--text-secondary)] opacity-60" style={{ width: `${90 - i * 10}%` }} />
            <div className="h-[2px] rounded bg-[var(--text-tertiary)] opacity-50 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TodoPreview() {
  return (
    <div
      className="w-[84px] h-[52px] rounded bg-white flex flex-col justify-center gap-1 px-1.5 border border-[var(--border)]"
      aria-hidden="true"
    >
      {[
        { done: true,  w: 75 },
        { done: false, w: 85 },
        { done: false, w: 60 },
      ].map((t, i) => (
        <div key={i} className="flex items-center gap-1">
          <CheckSquare
            size={8}
            weight={t.done ? 'fill' : 'regular'}
            className={t.done ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}
          />
          <div
            className={`h-[3px] rounded ${t.done ? 'bg-[var(--text-tertiary)] opacity-40' : 'bg-[var(--text-secondary)] opacity-60'}`}
            style={{ width: `${t.w}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function AIPreview() {
  return (
    <div
      className="w-[84px] h-[52px] rounded flex flex-col justify-center gap-1 px-1.5 border"
      style={{ background: 'var(--ai-bg)', borderColor: 'var(--ai-border)' }}
      aria-hidden="true"
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-1 rounded px-1 py-0.5"
          style={{ background: 'rgba(255,255,255,0.4)', border: '0.5px solid var(--ai-border)' }}
        >
          <MagicWand size={8} weight="fill" className="text-[var(--ai)]" />
          <div className="flex-1 flex flex-col gap-[1px]">
            <div className="h-[2.5px] rounded bg-[var(--ai-dark)] opacity-60" style={{ width: `${80 - i * 10}%` }} />
            <div className="h-[1.5px] rounded bg-[var(--ai-dark)] opacity-35 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultPreview() {
  return (
    <div className="w-[84px] h-[52px] rounded bg-white border border-[var(--border)] flex items-center justify-center" aria-hidden="true">
      <ListBullets size={20} className="text-[var(--text-tertiary)]" />
    </div>
  );
}

/**
 * Thumbnail for a custom report. If a reportId is provided, picks the
 * matching preview style for that report's display type. Otherwise shows
 * a generic funnel icon.
 */
function CustomReportPreview({ reportId }: { reportId?: string }) {
  const report = useCustomReportStore((s) => reportId ? s.reports.find((r) => r.id === reportId) : undefined);
  if (report) {
    if (report.display === 'bar')    return <BarPreview />;
    if (report.display === 'pie')    return <PiePreview />;
    if (report.display === 'donut')  return <PiePreview />;
    if (report.display === 'table')  return <ListPreview />;
    // number
    return (
      <div
        className="w-[84px] h-[52px] rounded bg-white flex flex-col justify-between p-1.5 border border-[var(--border)] relative overflow-hidden"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <div className="w-3.5 h-3.5 rounded flex items-center justify-center" style={{ background: '#7C3AED22' }}>
            <Funnel size={9} weight="fill" style={{ color: '#7C3AED' }} />
          </div>
          <div className="h-1 w-6 rounded" style={{ background: '#7C3AED44' }} />
        </div>
        <div className="font-extrabold leading-none" style={{ color: '#7C3AED', fontSize: 16 }}>
          42
        </div>
      </div>
    );
  }
  return (
    <div
      className="w-[84px] h-[52px] rounded flex items-center justify-center border border-[var(--border)]"
      style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)' }}
      aria-hidden="true"
    >
      <Funnel size={22} weight="fill" style={{ color: '#7C3AED' }} />
    </div>
  );
}
