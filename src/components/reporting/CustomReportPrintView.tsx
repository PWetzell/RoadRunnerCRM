'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { runReport, ReportResult } from '@/lib/custom-report-engine';
import { CustomReport, SOURCE_LABELS, AGGREGATION_LABELS, DISPLAY_LABELS, FILTER_OP_LABELS } from '@/types/custom-report';
import { getPreset } from '@/lib/cross-object-presets';
import { useUserStore } from '@/stores/user-store';

/**
 * Print-only view for one or more CustomReports.
 *
 * Lives inside a `.custom-report-print-host` wrapper which is hidden on-
 * screen but revealed by `@media print` rules in globals.css. When the store's
 * `printingReportIds` transitions from null → non-null, we:
 *   1. Set a body attribute so CSS knows we're in custom-report print mode
 *      (so the dashboard print host stays hidden).
 *   2. Wait a tick for React to render, then call window.print().
 *   3. Reset on 'afterprint' (or on a timeout fallback).
 *
 * Each report becomes one .custom-report-print-page block. Multi-report
 * packets use `page-break-before: always` so every report starts on a fresh
 * page in the PDF.
 */
export default function CustomReportPrintView() {
  const ids = useCustomReportStore((s) => s.printingReportIds);
  const reports = useCustomReportStore((s) => s.reports);
  const endPrint = useCustomReportStore((s) => s.endPrint);

  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);
  const user = useUserStore((s) => s.user);

  const activeReports = useMemo(() => {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => reports.find((r) => r.id === id)).filter(Boolean) as CustomReport[];
  }, [ids, reports]);

  const results = useMemo(() => {
    return activeReports.map((r) => runReport(r, { deals, contacts, documents }));
  }, [activeReports, deals, contacts, documents]);

  const printedRef = useRef(false);

  // Trigger browser print once the view has rendered
  useEffect(() => {
    if (!ids || ids.length === 0) {
      printedRef.current = false;
      return;
    }
    if (printedRef.current) return;

    document.body.setAttribute('data-print-mode', 'custom');

    const onAfter = () => {
      document.body.removeAttribute('data-print-mode');
      printedRef.current = false;
      endPrint();
      window.removeEventListener('afterprint', onAfter);
    };
    window.addEventListener('afterprint', onAfter);

    // Let React paint the new DOM before the print dialog opens.
    const t = window.setTimeout(() => {
      printedRef.current = true;
      try {
        window.print();
      } catch {
        // If something blocks, release state
        onAfter();
      }
      // Defensive fallback: if afterprint never fires (some browsers)
      window.setTimeout(() => {
        if (document.body.getAttribute('data-print-mode') === 'custom') onAfter();
      }, 1500);
    }, 120);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', onAfter);
    };
  }, [ids, endPrint]);

  if (!ids || ids.length === 0 || activeReports.length === 0) return null;

  const generated = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="custom-report-print-view">
      {activeReports.map((report, i) => (
        <div key={report.id} className="custom-report-print-page">
          <PrintPage
            report={report}
            result={results[i]}
            generated={generated}
            generatedBy={user?.name}
          />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported page renderer — used by both print and in-app preview.    */
/* ------------------------------------------------------------------ */

/**
 * Renders a single report laid out for an 8.5×11 printed page. Pure — no
 * side effects. Used by the print view AND by the Print Preview modal so
 * what the user sees in-app matches exactly what the printer produces.
 */
export function CustomReportPrintPage({
  report,
  result,
  generated,
  generatedBy,
}: {
  report: CustomReport;
  result: ReportResult;
  generated: string;
  generatedBy?: string;
}) {
  return (
    <PrintPage
      report={report}
      result={result}
      generated={generated}
      generatedBy={generatedBy}
    />
  );
}

function PrintPage({
  report,
  result,
  generated,
  generatedBy,
}: {
  report: CustomReport;
  result: ReportResult;
  generated: string;
  generatedBy?: string;
}) {
  return (
    <div style={{ padding: 0, fontFamily: 'Mulish, sans-serif', color: '#0F172A' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #1955A6', paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748B' }}>
          Roadrunner CRM Report
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
          {report.name}
        </div>
        {report.description && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
            {report.description}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, fontSize: 9, color: '#64748B' }}>
          <span>Generated {generated}{generatedBy ? ` by ${generatedBy}` : ''}</span>
          <span style={{ fontWeight: 700 }}>{result.totalCount} record{result.totalCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Metadata card */}
      <MetadataCard report={report} />

      {/* Result */}
      <div style={{ marginTop: 16 }}>
        {result.display === 'number' && <NumberPrint result={result} />}
        {result.display === 'bar' && <BarPrint result={result} />}
        {(result.display === 'pie' || result.display === 'donut') && (
          <PiePrint result={result} donut={result.display === 'donut'} />
        )}
        {result.display === 'table' && <TablePrint result={result} />}
      </div>

      {result.note && (
        <div style={{ marginTop: 10, fontSize: 9, color: '#64748B', fontStyle: 'italic' }}>
          {result.note}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 8, borderTop: '1px solid #E2E8F0', fontSize: 8, color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
        <span>Roadrunner CRM</span>
        <span>Report ID: {report.id}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Metadata panel                                                     */
/* ------------------------------------------------------------------ */

function MetadataCard({ report }: { report: CustomReport }) {
  const rows: { label: string; value: string }[] = [];
  rows.push({ label: 'Data source', value: SOURCE_LABELS[report.source] });

  if (report.source === 'cross-object') {
    const preset = report.presetMetricId ? getPreset(report.presetMetricId) : undefined;
    rows.push({ label: 'Metric', value: preset?.name ?? report.presetMetricId ?? '—' });
  } else {
    rows.push({
      label: 'Aggregation',
      value: `${AGGREGATION_LABELS[report.aggregation]}${report.field ? ` of ${report.field}` : ''}`,
    });
    rows.push({ label: 'Display', value: DISPLAY_LABELS[report.display] });
    if (report.groupBy) rows.push({ label: 'Grouped by', value: report.groupBy });
    if (report.sortBy) rows.push({ label: 'Sort', value: `${report.sortBy} ${report.sortDir ?? 'asc'}` });
    if (report.limit) rows.push({ label: 'Row limit', value: String(report.limit) });
    if (report.filters && report.filters.length > 0) {
      const text = report.filters
        .map((f) => {
          const val = Array.isArray(f.value) ? f.value.join(', ') : String(f.value ?? '');
          return `${f.field} ${FILTER_OP_LABELS[f.op]} ${val || '—'}`;
        })
        .join('; ');
      rows.push({ label: 'Filters', value: text });
    } else {
      rows.push({ label: 'Filters', value: 'None' });
    }
  }

  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        padding: 10,
        display: 'grid',
        gridTemplateColumns: '100px 1fr',
        rowGap: 4,
        columnGap: 10,
        fontSize: 9.5,
      }}
    >
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'contents' }}>
          <div style={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 8.5 }}>{r.label}</div>
          <div style={{ color: '#0F172A' }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result renderers — tuned for print                                 */
/* ------------------------------------------------------------------ */

function NumberPrint({ result }: { result: ReportResult }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 0' }}>
      <div style={{ fontSize: 72, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
        {result.valueFormatted ?? String(result.value ?? '—')}
      </div>
      {result.subtitle && (
        <div style={{ fontSize: 11, color: '#475569', marginTop: 10, fontWeight: 600 }}>
          {result.subtitle}
        </div>
      )}
    </div>
  );
}

function BarPrint({ result }: { result: ReportResult }) {
  const groups = result.groups ?? [];
  if (groups.length === 0) return <EmptyPrint message="No data matches the filters" />;
  const max = Math.max(1, ...groups.map((g) => g.value));
  const total = groups.reduce((s, g) => s + g.value, 0);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
          <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 9, textTransform: 'uppercase', color: '#64748B' }}>Group</th>
          <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 9, textTransform: 'uppercase', color: '#64748B' }}>Chart</th>
          <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 9, textTransform: 'uppercase', color: '#64748B' }}>Value</th>
          <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 9, textTransform: 'uppercase', color: '#64748B', width: 50 }}>%</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => {
          const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
          const barPct = (g.value / max) * 100;
          return (
            <tr key={g.label} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '6px', fontWeight: 700, textTransform: 'capitalize' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: g.color ?? '#64748B', marginRight: 6 }} />
                {g.label.replace(/-/g, ' ')}
              </td>
              <td style={{ padding: '6px' }}>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barPct}%`, background: g.color ?? '#64748B' }} />
                </div>
              </td>
              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{formatValue(g.value)}</td>
              <td style={{ padding: '6px', textAlign: 'right', color: '#475569' }}>{pct}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PiePrint({ result, donut }: { result: ReportResult; donut: boolean }) {
  const groups = result.groups ?? [];
  const total = groups.reduce((s, g) => s + g.value, 0);
  if (total === 0) return <EmptyPrint message="No data to chart" />;

  const size = 200;
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
      const full = items.length === 1;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const large = fraction > 0.5 ? 1 : 0;
      let d: string;
      if (full) {
        d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
      } else if (donut) {
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
      } else {
        d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      }
      slices.push({ id: `${g.label}-${i}`, d, color: g.color ?? '#64748B' });
      startAngle = endAngle;
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', padding: '16px 0' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.map((s) => (
          <path key={s.id} d={s.d} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
        ))}
        {donut && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize={22} fontWeight={900} fill="#0F172A">{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fontWeight={800} fill="#64748B">TOTAL</text>
          </>
        )}
      </svg>
      <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
        <tbody>
          {groups.map((g) => {
            const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
            return (
              <tr key={g.label}>
                <td style={{ padding: '2px 8px 2px 0' }}>
                  <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: g.color ?? '#64748B' }} />
                </td>
                <td style={{ padding: '2px 16px 2px 0', fontWeight: 700, textTransform: 'capitalize' }}>{g.label.replace(/-/g, ' ')}</td>
                <td style={{ padding: '2px 12px 2px 0', textAlign: 'right', fontWeight: 700 }}>{formatValue(g.value)}</td>
                <td style={{ padding: '2px 0', textAlign: 'right', color: '#475569' }}>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TablePrint({ result }: { result: ReportResult }) {
  const cols = result.columns ?? [];
  const rows = result.rows ?? [];
  if (rows.length === 0) return <EmptyPrint message="No rows match the filters" />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #0F172A', background: '#F8FAFC' }}>
          {cols.map((c) => (
            <th key={c.key} style={{ textAlign: 'left', padding: '6px', fontSize: 8.5, textTransform: 'uppercase', color: '#475569', letterSpacing: 0.4 }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
            {cols.map((c) => (
              <td key={c.key} style={{ padding: '5px 6px', color: '#0F172A' }}>
                {formatCell(row[c.key], c.key)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyPrint({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontStyle: 'italic', fontSize: 11 }}>
      {message}
    </div>
  );
}

function formatValue(n: number): string {
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
