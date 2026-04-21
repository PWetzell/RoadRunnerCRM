'use client';

import { useMemo } from 'react';
import { CustomReport } from '@/types/custom-report';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { runReport, ReportResult } from '@/lib/custom-report-engine';
import { Funnel, TrendUp, ChartBar, ChartPieSlice, ChartDonut, Table } from '@phosphor-icons/react';
import { getIcon } from '@/lib/phosphor-icons';

const TEXT_SCALE: Record<string, number> = { sm: 0.85, md: 1, lg: 1.15, xl: 1.35, xxl: 1.6 };

/**
 * Live preview pane shown on the right side of the Report Builder modal.
 * Renders the same result types as CustomReportWidget but in a self-contained
 * card (no Widget wrapper, no grid customizations). Updates on every form
 * change via the `draft` prop.
 */
export default function ReportBuilderPreview({ draft }: { draft: CustomReport }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);

  const result = useMemo<ReportResult>(
    () => runReport(draft, { deals, contacts, documents }),
    [draft, deals, contacts, documents]
  );

  const style = draft.style ?? {};
  const DefaultIcon = iconForDisplay(result.display);
  const CustomIcon = style.iconName ? getIcon(style.iconName) : null;
  const Icon = CustomIcon ?? DefaultIcon;

  const headerBg = style.headerColor ?? 'var(--brand-primary)';
  const titleScale = TEXT_SCALE[style.titleSize ?? 'md'] ?? 1;
  const contentScale = TEXT_SCALE[style.contentTextSize ?? 'md'] ?? 1;
  const contentColor = style.contentTextColor ?? 'var(--text-primary)';
  const alignClass = style.contentAlign === 'right'
    ? 'text-right'
    : style.contentAlign === 'center'
    ? 'text-center'
    : '';

  return (
    <div className="flex flex-col h-full">
      {/* Preview card */}
      <div className="flex-1 min-h-0 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
        <div
          className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]"
          style={{ background: headerBg, color: 'white' }}
        >
          <Icon size={16} weight="fill" style={style.iconColor ? { color: style.iconColor } : undefined} />
          <h3
            className="font-extrabold truncate"
            style={{
              fontSize: 13 * titleScale,
              color: style.titleColor ?? 'white',
            }}
          >
            {draft.name || 'Untitled report'}
          </h3>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide opacity-80">
            Live preview
          </span>
        </div>

        <div
          className={`flex-1 min-h-0 overflow-auto p-5 ${alignClass}`}
          style={{ color: contentColor, ['--content-scale' as string]: String(contentScale) }}
        >
          {result.display === 'number' && <NumberView result={result} scale={contentScale} color={contentColor} />}
          {result.display === 'bar' && <BarView result={result} />}
          {(result.display === 'pie' || result.display === 'donut') && (
            <PieView result={result} donut={result.display === 'donut'} />
          )}
          {result.display === 'table' && <TableView result={result} />}
          {result.note && (
            <div className="mt-3 text-[11px] text-[var(--text-tertiary)] italic text-right">
              {result.note}
            </div>
          )}
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-3 text-[11px] text-[var(--text-tertiary)]">
        {draft.source === 'cross-object'
          ? draft.presetMetricId
            ? `Cross-object preset • ${result.totalCount} record${result.totalCount === 1 ? '' : 's'}`
            : 'Pick a preset to see the result.'
          : `${draft.aggregation.toUpperCase()} of ${result.totalCount} filtered record${result.totalCount === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}

function iconForDisplay(display: string) {
  switch (display) {
    case 'number': return TrendUp;
    case 'bar':    return ChartBar;
    case 'pie':    return ChartPieSlice;
    case 'donut':  return ChartDonut;
    case 'table':  return Table;
    default:       return Funnel;
  }
}

/* ------------------------------------------------------------------ */
/*  View renderers (simplified vs CustomReportWidget — no scaling)     */
/* ------------------------------------------------------------------ */

function NumberView({ result, scale, color }: { result: ReportResult; scale: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div
        className="font-extrabold leading-none tracking-tight"
        style={{ fontSize: 64 * scale, color }}
      >
        {result.valueFormatted ?? String(result.value ?? '—')}
      </div>
      {result.subtitle && (
        <div
          className="mt-2 font-semibold text-[var(--text-tertiary)]"
          style={{ fontSize: 13 * scale }}
        >
          {result.subtitle}
        </div>
      )}
    </div>
  );
}

function BarView({ result }: { result: ReportResult }) {
  const groups = result.groups ?? [];
  if (groups.length === 0) return <Empty message="No data matches the filters" />;
  const max = Math.max(1, ...groups.map((g) => g.value));
  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((g) => {
        const pct = (g.value / max) * 100;
        return (
          <div key={g.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                <span className="font-bold text-[var(--text-primary)] truncate capitalize">{pretty(g.label)}</span>
              </span>
              <span className="text-[var(--text-tertiary)] font-semibold ml-2 flex-shrink-0">
                {formatVal(g.value)}
              </span>
            </div>
            <div className="h-2.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, g.value > 0 ? 3 : 0)}%`, background: g.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieView({ result, donut }: { result: ReportResult; donut: boolean }) {
  const groups = result.groups ?? [];
  const total = groups.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <Empty message="No data to chart" />;

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const innerR = donut ? r * 0.55 : 0;

  const slices: { id: string; d: string; color: string }[] = [];
  const items = groups.filter((g) => g.value > 0);
  if (items.length > 0) {
    let startAngle = -Math.PI / 2;
    items.forEach((g, i) => {
      const fraction = g.value / total;
      const endAngle = startAngle + fraction * 2 * Math.PI;
      const isFullCircle = items.length === 1;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = fraction > 0.5 ? 1 : 0;
      let d: string;
      if (isFullCircle) {
        d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
        if (donut) d += ` M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} Z`;
      } else if (donut) {
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
      } else {
        d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }
      slices.push({ id: `${g.label}-${i}`, d, color: g.color ?? '#64748B' });
      startAngle = endAngle;
    });
  }

  return (
    <div className="flex items-center gap-6 justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {slices.map((s) => (
          <path key={s.id} d={s.d} fill={s.color} stroke="var(--surface-card)" strokeWidth={2} />
        ))}
        {donut && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" className="fill-[var(--text-primary)] font-extrabold" style={{ fontSize: 18 }}>{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-[var(--text-tertiary)] font-bold" style={{ fontSize: 9 }}>TOTAL</text>
          </>
        )}
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {groups.map((g) => {
          const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
          return (
            <div key={g.label} className="flex items-center gap-2 text-[12px]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
              <span className="font-bold text-[var(--text-primary)] capitalize">{pretty(g.label)}</span>
              <span className="text-[var(--text-tertiary)] font-semibold ml-auto">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableView({ result }: { result: ReportResult }) {
  const cols = result.columns ?? [];
  const rows = result.rows ?? [];
  if (rows.length === 0) return <Empty message="No rows match the filters" />;
  return (
    <div className="overflow-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-[var(--text-tertiary)] border-b border-[var(--border)]">
            {cols.map((c) => (
              <th key={c.key} className="text-left font-bold uppercase tracking-wide px-2 py-1.5 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-1.5 text-[var(--text-primary)] truncate max-w-[220px]">
                  {formatCell(row[c.key], c.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-tertiary)] italic">
      {message}
    </div>
  );
}

function pretty(s: string): string {
  return s.replace(/-/g, ' ');
}

function formatVal(n: number): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000)    return `${(n / 1_000).toFixed(0)}K`;
  if (Math.abs(n - Math.round(n)) > 0.01) return n.toFixed(1);
  return String(Math.round(n));
}

function formatCell(value: unknown, key: string): string {
  if (value == null || value === '') return '—';
  if (key === 'amount' && typeof value === 'number') {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (key === 'size' && typeof value === 'number') {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(0)} KB`;
    return `${value} B`;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
