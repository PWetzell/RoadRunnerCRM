'use client';

import { useMemo } from 'react';
import { CustomReport } from '@/types/custom-report';
import { runReport, ReportResult } from '@/lib/custom-report-engine';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';

/**
 * Compact live preview of a CustomReport rendered inside a library card.
 *
 * Shows the actual current data (same engine as the real widget) at a size
 * tuned for a ~280×120 card panel. This removes the need for the user to
 * click "Edit" just to remember what the report looks like.
 */
export default function ReportMiniPreview({ report }: { report: CustomReport }) {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);

  const result = useMemo<ReportResult>(
    () => runReport(report, { deals, contacts, documents }),
    [report, deals, contacts, documents]
  );

  return (
    <div
      className="w-full rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center overflow-hidden"
      style={{ height: 120 }}
      aria-hidden="true"
    >
      {result.display === 'number' && <MiniNumber result={result} />}
      {result.display === 'bar' && <MiniBar result={result} />}
      {(result.display === 'pie' || result.display === 'donut') && (
        <MiniPie result={result} donut={result.display === 'donut'} />
      )}
      {result.display === 'table' && <MiniTable result={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini renderers                                                     */
/* ------------------------------------------------------------------ */

function MiniNumber({ result }: { result: ReportResult }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 text-center">
      <div className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
        {result.valueFormatted ?? String(result.value ?? '—')}
      </div>
      {result.subtitle && (
        <div className="mt-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] line-clamp-1 max-w-full">
          {result.subtitle}
        </div>
      )}
    </div>
  );
}

function MiniBar({ result }: { result: ReportResult }) {
  const groups = (result.groups ?? []).slice(0, 4);
  if (groups.length === 0) return <MiniEmpty />;
  const max = Math.max(1, ...groups.map((g) => g.value));
  return (
    <div className="w-full h-full px-3 py-2.5 flex flex-col justify-center gap-1.5">
      {groups.map((g) => {
        const pct = (g.value / max) * 100;
        return (
          <div key={g.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
            <span className="font-bold text-[var(--text-primary)] capitalize truncate max-w-[64px]">
              {g.label.replace(/-/g, ' ')}
            </span>
            <div className="flex-1 h-1.5 bg-[var(--surface-card)] rounded-full overflow-hidden mx-1">
              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, g.value > 0 ? 4 : 0)}%`, background: g.color }} />
            </div>
            <span className="font-semibold text-[var(--text-tertiary)] tabular-nums">{formatVal(g.value)}</span>
          </div>
        );
      })}
      {(result.groups?.length ?? 0) > 4 && (
        <div className="text-[9px] text-[var(--text-tertiary)] italic text-right">
          +{(result.groups?.length ?? 0) - 4} more
        </div>
      )}
    </div>
  );
}

function MiniPie({ result, donut }: { result: ReportResult; donut: boolean }) {
  const groups = result.groups ?? [];
  const total = groups.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <MiniEmpty />;

  const size = 92;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;
  const innerR = donut ? r * 0.55 : 0;

  const slices: { id: string; d: string; color: string }[] = [];
  const items = groups.filter((g) => g.value > 0);
  let startAngle = -Math.PI / 2;
  items.forEach((g, i) => {
    const frac = g.value / total;
    const end = startAngle + frac * 2 * Math.PI;
    const full = items.length === 1;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    let d: string;
    if (full) {
      d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    } else if (donut) {
      const ix1 = cx + innerR * Math.cos(end);
      const iy1 = cy + innerR * Math.sin(end);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);
      d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
    } else {
      d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }
    slices.push({ id: `${g.label}-${i}`, d, color: g.color ?? '#64748B' });
    startAngle = end;
  });

  const top3 = groups.slice(0, 3);

  return (
    <div className="w-full h-full px-3 flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {slices.map((s) => (
          <path key={s.id} d={s.d} fill={s.color} stroke="var(--surface-raised)" strokeWidth={1} />
        ))}
        {donut && (
          <text x={cx} y={cy + 3} textAnchor="middle" className="fill-[var(--text-primary)] font-extrabold" style={{ fontSize: 12 }}>
            {total}
          </text>
        )}
      </svg>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-[9px]">
        {top3.map((g) => {
          const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
          return (
            <div key={g.label} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
              <span className="font-bold text-[var(--text-primary)] capitalize truncate">{g.label.replace(/-/g, ' ')}</span>
              <span className="font-semibold text-[var(--text-tertiary)] ml-auto">{pct}%</span>
            </div>
          );
        })}
        {groups.length > 3 && (
          <div className="text-[9px] text-[var(--text-tertiary)] italic">+{groups.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

function MiniTable({ result }: { result: ReportResult }) {
  const cols = (result.columns ?? []).slice(0, 3);
  const rows = (result.rows ?? []).slice(0, 3);
  if (rows.length === 0) return <MiniEmpty />;
  return (
    <div className="w-full h-full px-2.5 py-2 overflow-hidden">
      <table className="w-full text-[9px]">
        <thead>
          <tr className="text-[var(--text-tertiary)] border-b border-[var(--border)]">
            {cols.map((c) => (
              <th key={c.key} className="text-left font-bold uppercase tracking-wide px-1 py-0.5 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
              {cols.map((c) => (
                <td key={c.key} className="px-1 py-0.5 text-[var(--text-primary)] truncate max-w-[80px]">
                  {formatCell(row[c.key], c.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(result.rows?.length ?? 0) > 3 && (
        <div className="mt-0.5 text-[9px] text-[var(--text-tertiary)] italic text-right">
          +{(result.rows?.length ?? 0) - 3} more rows
        </div>
      )}
    </div>
  );
}

function MiniEmpty() {
  return (
    <div className="text-[10px] italic text-[var(--text-tertiary)] px-3 text-center">
      No data matches the filters
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

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
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  if (Array.isArray(value)) return value.join(', ');
  const s = String(value);
  return s.length > 18 ? s.slice(0, 16) + '…' : s;
}
