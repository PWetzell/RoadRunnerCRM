'use client';

import { useMemo } from 'react';
import { WidgetConfig } from '@/types/dashboard';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { runReport, ReportResult } from '@/lib/custom-report-engine';
import { CustomReport } from '@/types/custom-report';
import Widget from '../Widget';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { useIsDark } from '@/hooks/useIsDark';
import { paletteColor, ChartPaletteId } from '@/lib/chart-palettes';

/**
 * Renders a user-defined CustomReport. The widget's `config.reportId` points
 * to a report stored in the custom-report store. If the report has been
 * deleted, we fall back to a graceful placeholder.
 */
export default function CustomReportWidget({ widget }: { widget: WidgetConfig }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);
  const reports = useCustomReportStore((s) => s.reports);
  const isDark = useIsDark();
  const palette = (widget.config?.chartPalette as ChartPaletteId) || 'default';

  const reportId = widget.config?.reportId as string | undefined;
  const report = useMemo(
    () => reports.find((r) => r.id === reportId),
    [reports, reportId]
  );

  const result = useMemo<ReportResult | null>(() => {
    if (!report) return null;
    const base = runReport(report, { deals, contacts, documents });
    // Override group colors when a non-default palette is selected. Leaves
    // the native report colors in place when the palette is 'default'.
    if (palette !== 'default' && base.groups) {
      return {
        ...base,
        groups: base.groups.map((g, i) => ({ ...g, color: paletteColor(palette, i, isDark) })),
      };
    }
    return base;
  }, [report, deals, contacts, documents, palette, isDark]);

  const title = widget.title || report?.name || 'Custom report';
  const defaultIconName = iconForDisplay(report?.display);

  // Merge report-level style defaults with widget-level overrides. Widget
  // settings always win — the report just supplies defaults for anywhere
  // the widget doesn't explicitly override.
  const mergedWidget = useMemo(() => {
    if (!report?.style) return widget;
    const s = report.style;
    return {
      ...widget,
      headerColor:     widget.headerColor     ?? s.headerColor,
      iconName:        widget.iconName        ?? s.iconName,
      iconColor:       widget.iconColor       ?? s.iconColor,
      titleColor:      widget.titleColor      ?? s.titleColor,
      titleSize:       widget.titleSize       ?? s.titleSize,
      contentTextColor:widget.contentTextColor?? s.contentTextColor,
      contentTextSize: widget.contentTextSize ?? s.contentTextSize,
      subtitleColor:   widget.subtitleColor   ?? s.subtitleColor,
      contentAlign:    widget.contentAlign    ?? s.contentAlign,
    };
  }, [widget, report?.style]);

  if (!report || !result) {
    return (
      <Widget widget={widget} title={title} defaultIconName="Funnel">
        <div className="flex items-center justify-center h-full text-[calc(11px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] text-center px-2">
          {reportId
            ? 'Report deleted — edit this widget to pick a different report.'
            : 'No report selected.'}
        </div>
      </Widget>
    );
  }

  return (
    <Widget widget={mergedWidget} title={title} defaultIconName={defaultIconName}>
      {result.display === 'number' && <NumberView result={result} />}
      {result.display === 'bar' && <BarView result={result} />}
      {(result.display === 'pie' || result.display === 'donut') && (
        <PieView result={result} donut={result.display === 'donut'} />
      )}
      {result.display === 'table' && <TableView result={result} report={report} />}
      {result.note && (
        <div className="mt-2 text-[calc(9px*var(--content-scale,1))] @md:text-[calc(10px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] italic text-right">
          {result.note}
        </div>
      )}
    </Widget>
  );
}

function iconForDisplay(display?: CustomReport['display']): string {
  switch (display) {
    case 'number': return 'TrendUp';
    case 'bar':    return 'ChartBar';
    case 'pie':    return 'ChartPieSlice';
    case 'donut':  return 'ChartDonut';
    case 'table':  return 'Table';
    default:       return 'Funnel';
  }
}

/* ------------------------------------------------------------------ */
/*  Number                                                             */
/* ------------------------------------------------------------------ */

function NumberView({ result }: { result: ReportResult }) {
  return (
    <div className="flex flex-col justify-center h-full">
      <AnimatedCounter
        value={result.valueFormatted ?? String(result.value ?? '—')}
        className="text-[calc(28px*var(--content-scale,1))] @sm:text-[calc(32px*var(--content-scale,1))] @md:text-[calc(44px*var(--content-scale,1))] @lg:text-[calc(56px*var(--content-scale,1))] @xl:text-[calc(72px*var(--content-scale,1))] @3xl:text-[calc(88px*var(--content-scale,1))] font-extrabold leading-none tracking-tight text-[var(--widget-primary-text)] block"
      />
      {result.subtitle && (
        <div className="text-[calc(10px*var(--widget-subtitle-scale,1))] @md:text-[calc(12px*var(--widget-subtitle-scale,1))] @lg:text-[calc(13px*var(--widget-subtitle-scale,1))] @xl:text-[calc(14px*var(--widget-subtitle-scale,1))] text-[var(--widget-tertiary-text)] mt-1.5 @md:mt-2 @lg:mt-3 font-semibold">
          {result.subtitle}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar (horizontal rows)                                              */
/* ------------------------------------------------------------------ */

function BarView({ result }: { result: ReportResult }) {
  const groups = result.groups ?? [];
  if (groups.length === 0) {
    return <EmptyState message="No data matches the filters" />;
  }
  const max = Math.max(1, ...groups.map((g) => g.value));
  return (
    <div className="flex flex-col gap-1.5 @md:gap-2 @xl:gap-3">
      {groups.map((g) => {
        const pct = (g.value / max) * 100;
        return (
          <div key={g.label}>
            <div className="flex items-center justify-between text-[calc(10px*var(--content-scale,1))] @md:text-[calc(11px*var(--content-scale,1))] @xl:text-[calc(13px*var(--content-scale,1))] mb-0.5 @md:mb-1 @xl:mb-1.5">
              <span className="inline-flex items-center gap-1 @md:gap-1.5 @xl:gap-2 min-w-0 flex-1">
                <span className="w-2 h-2 @md:w-2.5 @md:h-2.5 @xl:w-3 @xl:h-3 rounded-full flex-shrink-0" style={{ background: g.color }} />
                <span className="font-bold text-[var(--widget-primary-text)] truncate capitalize">{prettyLabel(g.label)}</span>
              </span>
              <span className="text-[var(--widget-tertiary-text)] font-semibold flex-shrink-0 ml-2">
                {formatGroupValue(g.value)}
              </span>
            </div>
            <div className="h-1.5 @md:h-2 @xl:h-3 bg-[var(--surface-raised)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(pct, g.value > 0 ? 3 : 0)}%`, background: g.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pie / Donut (SVG)                                                  */
/* ------------------------------------------------------------------ */

function PieView({ result, donut }: { result: ReportResult; donut: boolean }) {
  const groups = result.groups ?? [];
  const total = groups.reduce((a, b) => a + b.value, 0);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const innerR = donut ? r * 0.55 : 0;

  const slices = useMemo(() => {
    const items = groups.filter((g) => g.value > 0);
    if (items.length === 0 || total === 0) return [];
    let startAngle = -Math.PI / 2;
    return items.map((g, i) => {
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
        if (donut) {
          d += ` M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} Z`;
        }
      } else if (donut) {
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
      } else {
        d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }

      const slice = { id: `${g.label}-${i}`, d, color: g.color ?? '#64748B', label: g.label, value: g.value };
      startAngle = endAngle;
      return slice;
    });
  }, [groups, total, cx, cy, r, innerR, donut]);

  if (total === 0) return <EmptyState message="No data to chart" />;

  return (
    <div className="flex items-center gap-4 @md:gap-5 justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {slices.map((s) => (
          <path key={s.id} d={s.d} fill={s.color} stroke="var(--surface-card)" strokeWidth={1.5} />
        ))}
        {donut && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" className="fill-[var(--widget-primary-text)] font-extrabold" style={{ fontSize: 14 }}>
              {total}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="fill-[var(--widget-tertiary-text)] font-bold" style={{ fontSize: 8 }}>
              TOTAL
            </text>
          </>
        )}
      </svg>
      <div className="flex flex-col gap-1 min-w-0">
        {groups.map((g) => {
          const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
          return (
            <div key={g.label} className="flex items-center gap-1.5 text-[calc(10px*var(--content-scale,1))] @md:text-[calc(11px*var(--content-scale,1))]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
              <span className="font-bold text-[var(--widget-primary-text)] truncate capitalize">{prettyLabel(g.label)}</span>
              <span className="text-[var(--widget-tertiary-text)] font-semibold ml-auto flex-shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

function TableView({ result, report }: { result: ReportResult; report: CustomReport }) {
  const cols = result.columns ?? [];
  const rows = result.rows ?? [];
  if (rows.length === 0) return <EmptyState message="No rows match the filters" />;

  return (
    <div className="overflow-auto h-full -mx-1">
      <table className="w-full text-[calc(10px*var(--content-scale,1))] @md:text-[calc(11px*var(--content-scale,1))] @xl:text-[calc(12px*var(--content-scale,1))]">
        <thead>
          <tr className="text-[var(--widget-tertiary-text)] border-b border-[var(--border)]">
            {cols.map((c) => (
              <th key={c.key} className="text-left font-bold uppercase tracking-wide px-1.5 py-1 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
              {cols.map((c) => (
                <td key={c.key} className="px-1.5 py-1 text-[var(--widget-primary-text)] truncate max-w-[180px]">
                  {formatCell(row[c.key], c.key, report.source)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared                                                             */
/* ------------------------------------------------------------------ */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-[calc(11px*var(--content-scale,1))] text-[var(--widget-tertiary-text)] text-center px-2">
      {message}
    </div>
  );
}

function prettyLabel(label: string): string {
  if (!label) return '—';
  // Replace hyphens with spaces for stage ids like "closed-won"
  return label.replace(/-/g, ' ');
}

function formatGroupValue(n: number): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000)    return `${(n / 1_000).toFixed(0)}K`;
  if (Math.abs(n - Math.round(n)) > 0.01) return n.toFixed(1);
  return String(Math.round(n));
}

function formatCell(value: unknown, key: string, _source: string): string {
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
