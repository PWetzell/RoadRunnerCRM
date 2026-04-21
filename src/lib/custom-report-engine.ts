/**
 * Custom Report query engine.
 *
 * Takes a `CustomReport` definition and a context bag of entity data, runs the
 * filter chain, applies aggregation, optionally groups, and returns a
 * `ReportResult` ready to render in `CustomReportWidget`.
 *
 * This is the single source of truth for executing report definitions — used
 * both by the widget (on-dashboard display) and the Report Builder's live
 * preview pane.
 */

import { CustomReport, FilterClause, FilterOp, getField } from '@/types/custom-report';
import { Deal, DEAL_STAGES, DealStage, STAGE_META } from '@/types/deal';
import { ContactWithEntries } from '@/types/contact';
import { CrmDocument } from '@/types/document';
import {
  CROSS_OBJECT_PRESETS,
  CrossObjectContext,
  ReportResult,
  getPreset,
} from './cross-object-presets';

export type { ReportResult };

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

export interface ReportContext {
  deals: Deal[];
  contacts: ContactWithEntries[];
  documents: CrmDocument[];
}

/* ------------------------------------------------------------------ */
/*  Value resolver                                                     */
/* ------------------------------------------------------------------ */

/** Walk a dotted path like "entries.emails.0.value" against a row. */
function getValue(row: unknown, path: string): unknown {
  if (row == null || typeof row !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = row;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/* ------------------------------------------------------------------ */
/*  Filter comparator                                                  */
/* ------------------------------------------------------------------ */

function compare(value: unknown, op: FilterOp, target: string | number | string[]): boolean {
  // Empty / notEmpty operate on any value type
  if (op === 'empty') {
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
  }
  if (op === 'notEmpty') {
    return !(value == null || value === '' || (Array.isArray(value) && value.length === 0));
  }

  // withinDays / olderThanDays operate on a date value
  if (op === 'withinDays' || op === 'olderThanDays') {
    if (value == null) return false;
    const n = Number(target);
    if (!isFinite(n)) return false;
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return false;
    const now = Date.now();
    const cutoff = now - n * 86_400_000;
    return op === 'withinDays' ? date.getTime() >= cutoff : date.getTime() < cutoff;
  }

  // in / notIn operate on array targets
  if (op === 'in' || op === 'notIn') {
    const list = Array.isArray(target) ? target : [String(target)];
    const strVal = value == null ? '' : String(value);
    const hit = list.includes(strVal);
    return op === 'in' ? hit : !hit;
  }

  // contains / notContains — substring for strings, includes for arrays
  if (op === 'contains' || op === 'notContains') {
    const needle = String(target).toLowerCase();
    if (Array.isArray(value)) {
      const hit = value.some((v) => String(v).toLowerCase().includes(needle));
      return op === 'contains' ? hit : !hit;
    }
    const haystack = value == null ? '' : String(value).toLowerCase();
    const hit = haystack.includes(needle);
    return op === 'contains' ? hit : !hit;
  }

  // Numeric / date / scalar compare
  // Date values come in ISO strings — compare via getTime for ordering.
  const isDateLike = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
  let a: number | string;
  let b: number | string;
  if (isDateLike) {
    a = new Date(String(value)).getTime();
    b = new Date(String(target)).getTime();
    if (isNaN(a as number) || isNaN(b as number)) return false;
  } else if (typeof value === 'number' || typeof target === 'number') {
    a = Number(value);
    b = Number(target);
    if (!isFinite(a as number) || !isFinite(b as number)) {
      // fall back to string compare if either is NaN
      a = value == null ? '' : String(value);
      b = String(target);
    }
  } else if (typeof value === 'boolean' || String(target) === 'true' || String(target) === 'false') {
    const va = value === true || String(value).toLowerCase() === 'true';
    const vb = String(target).toLowerCase() === 'true';
    if (op === 'eq') return va === vb;
    if (op === 'neq') return va !== vb;
    return false;
  } else {
    a = value == null ? '' : String(value);
    b = String(target);
  }

  switch (op) {
    case 'eq':  return a === b;
    case 'neq': return a !== b;
    case 'gt':  return (a as number) > (b as number);
    case 'gte': return (a as number) >= (b as number);
    case 'lt':  return (a as number) < (b as number);
    case 'lte': return (a as number) <= (b as number);
    default:    return false;
  }
}

function applyFilters<T>(rows: T[], filters: FilterClause[]): T[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) => filters.every((f) => compare(getValue(row, f.field), f.op, f.value)));
}

/* ------------------------------------------------------------------ */
/*  Aggregation                                                        */
/* ------------------------------------------------------------------ */

function aggregate(values: number[], agg: CustomReport['aggregation']): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case 'count': return values.length;
    case 'sum':   return values.reduce((a, b) => a + b, 0);
    case 'avg':   return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':   return Math.min(...values);
    case 'max':   return Math.max(...values);
  }
}

function formatNumber(n: number, agg: CustomReport['aggregation'], fieldKey?: string): string {
  if (!isFinite(n)) return '—';
  const isMoney = fieldKey === 'amount';
  if (agg === 'count') return String(Math.round(n));
  if (isMoney) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  }
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000)    return `${(n / 1_000).toFixed(0)}K`;
  const hasFraction = Math.abs(n - Math.round(n)) > 0.01;
  return hasFraction ? n.toFixed(1) : String(Math.round(n));
}

/* ------------------------------------------------------------------ */
/*  Group color                                                        */
/* ------------------------------------------------------------------ */

/** Stable palette for non-stage groupings — cycles through 8 brand-safe hues. */
const GROUP_PALETTE = [
  '#1955A6', '#0E7490', '#059669', '#D97706',
  '#7C3AED', '#DC2626', '#5B21B6', '#9D174D',
];

function colorForGroup(groupKey: string, label: string, index: number): string {
  if (groupKey === 'stage') {
    const meta = STAGE_META[label as DealStage];
    if (meta) return meta.color;
  }
  return GROUP_PALETTE[index % GROUP_PALETTE.length];
}

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

export function runReport(report: CustomReport, ctx: ReportContext): ReportResult {
  // Cross-object preset path
  if (report.source === 'cross-object') {
    if (!report.presetMetricId) {
      return {
        display: report.display,
        totalCount: 0,
        note: 'No preset selected',
      };
    }
    const preset = getPreset(report.presetMetricId);
    if (!preset) {
      return {
        display: report.display,
        totalCount: 0,
        note: `Unknown preset: ${report.presetMetricId}`,
      };
    }
    const crossCtx: CrossObjectContext = {
      deals: ctx.deals,
      contacts: ctx.contacts,
      documents: ctx.documents,
    };
    return preset.compute(crossCtx);
  }

  // Resolve the base entity array for the source
  const baseRows: Record<string, unknown>[] =
    report.source === 'deals'    ? (ctx.deals as unknown as Record<string, unknown>[]) :
    report.source === 'contacts' ? (ctx.contacts as unknown as Record<string, unknown>[]) :
    report.source === 'documents' ? (ctx.documents as unknown as Record<string, unknown>[]) :
    [];

  // Apply filters
  const filtered = applyFilters(baseRows, report.filters);
  const totalCount = filtered.length;

  /* ------------------- TABLE display --------------------- */
  if (report.display === 'table') {
    let rows = [...filtered];
    if (report.sortBy) {
      const dir = report.sortDir === 'desc' ? -1 : 1;
      rows.sort((a, b) => {
        const av = getValue(a, report.sortBy!);
        const bv = getValue(b, report.sortBy!);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    if (report.limit && report.limit > 0) rows = rows.slice(0, report.limit);

    // Pick a sensible default column set from the field registry
    const cols = pickTableColumns(report.source, report);

    const displayRows = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const c of cols) out[c.key] = getValue(row, c.key);
      return out;
    });

    return {
      display: 'table',
      columns: cols,
      rows: displayRows,
      totalCount,
      note: report.limit && totalCount > report.limit ? `Showing ${rows.length} of ${totalCount}` : undefined,
    };
  }

  /* ------------------- GROUPED displays (bar/pie/donut) --------------------- */
  if (report.groupBy && (report.display === 'bar' || report.display === 'pie' || report.display === 'donut')) {
    const buckets = new Map<string, number[]>();
    for (const row of filtered) {
      const key = String(getValue(row, report.groupBy) ?? '—');
      const arr = buckets.get(key) ?? [];
      if (report.aggregation === 'count') {
        arr.push(1);
      } else if (report.field) {
        const n = Number(getValue(row, report.field));
        if (isFinite(n)) arr.push(n);
      }
      buckets.set(key, arr);
    }

    const groupEntries = Array.from(buckets.entries())
      .map(([label, values], i) => ({
        label,
        value: report.aggregation === 'count'
          ? values.length
          : aggregate(values, report.aggregation),
        color: colorForGroup(report.groupBy!, label, i),
      }))
      .sort((a, b) => b.value - a.value);

    // If grouping by stage, reorder to the canonical pipeline order.
    if (report.groupBy === 'stage') {
      const order: DealStage[] = DEAL_STAGES.map((s) => s.id);
      groupEntries.sort(
        (a, b) => order.indexOf(a.label as DealStage) - order.indexOf(b.label as DealStage)
      );
    }

    return {
      display: report.display,
      groups: groupEntries,
      totalCount,
    };
  }

  /* ------------------- NUMBER (or fallback) --------------------- */
  let values: number[];
  if (report.aggregation === 'count') {
    values = filtered.map(() => 1);
  } else if (report.field) {
    values = filtered
      .map((row) => Number(getValue(row, report.field!)))
      .filter((n) => isFinite(n));
  } else {
    values = [];
  }

  const value = aggregate(values, report.aggregation);
  return {
    display: 'number',
    value,
    valueFormatted: formatNumber(value, report.aggregation, report.field),
    subtitle:
      report.aggregation === 'count'
        ? `Across ${totalCount} record${totalCount === 1 ? '' : 's'}`
        : `From ${values.length} record${values.length === 1 ? '' : 's'}`,
    totalCount,
  };
}

/* ------------------------------------------------------------------ */
/*  Table column defaults                                              */
/* ------------------------------------------------------------------ */

function pickTableColumns(
  source: CustomReport['source'],
  report: CustomReport
): { key: string; label: string }[] {
  // Default column sets per source — kept small so the widget stays readable.
  const defaults: Record<'deals' | 'contacts' | 'documents' | 'cross-object', string[]> = {
    deals:         ['name', 'stage', 'amount', 'owner'],
    contacts:      ['name', 'type', 'status', 'assignedTo'],
    documents:     ['name', 'category', 'size', 'uploadedBy'],
    'cross-object': [],
  };
  const keys = defaults[source] ?? [];
  return keys
    .map((k) => {
      const def = getField(source, k);
      return def ? { key: def.key, label: def.label } : null;
    })
    .filter((c): c is { key: string; label: string } => c !== null)
    .concat(
      // Ensure the sort field is always present
      report.sortBy && !keys.includes(report.sortBy)
        ? [{ key: report.sortBy, label: getField(source, report.sortBy)?.label ?? report.sortBy }]
        : []
    );
}
