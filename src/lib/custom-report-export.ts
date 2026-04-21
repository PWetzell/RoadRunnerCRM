/**
 * CSV / JSON export helpers for CustomReports.
 *
 * Converts any ReportResult shape (number, bar, pie, donut, table) into a
 * downloadable CSV, and produces a short metadata header describing the
 * report definition so the CSV is self-explanatory when opened in Excel.
 */

import { CustomReport, SOURCE_LABELS, AGGREGATION_LABELS, DISPLAY_LABELS, FILTER_OP_LABELS } from '@/types/custom-report';
import { ReportResult } from '@/lib/custom-report-engine';
import { getPreset } from '@/lib/cross-object-presets';
import { toCSV, downloadCSV, CSVColumn } from '@/lib/csv-export';

/** Human-readable description of the report's filters. */
export function describeFilters(report: CustomReport): string {
  if (!report.filters || report.filters.length === 0) return 'None';
  return report.filters
    .map((f) => {
      const val = Array.isArray(f.value) ? f.value.join(', ') : String(f.value ?? '');
      return `${f.field} ${FILTER_OP_LABELS[f.op]} ${val || '—'}`.trim();
    })
    .join('; ');
}

/** Short summary string for the header section of the CSV. */
export function describeReport(report: CustomReport): string[] {
  const lines: string[] = [];
  lines.push(`Report: ${report.name}`);
  if (report.description) lines.push(`Description: ${report.description}`);
  lines.push(`Source: ${SOURCE_LABELS[report.source]}`);
  if (report.source === 'cross-object') {
    const preset = report.presetMetricId ? getPreset(report.presetMetricId) : undefined;
    lines.push(`Metric: ${preset?.name ?? report.presetMetricId ?? '—'}`);
  } else {
    lines.push(`Aggregation: ${AGGREGATION_LABELS[report.aggregation]}${report.field ? ` of ${report.field}` : ''}`);
    lines.push(`Display: ${DISPLAY_LABELS[report.display]}`);
    if (report.groupBy) lines.push(`Grouped by: ${report.groupBy}`);
    lines.push(`Filters: ${describeFilters(report)}`);
    if (report.sortBy) lines.push(`Sort: ${report.sortBy} ${report.sortDir ?? 'asc'}`);
    if (report.limit) lines.push(`Row limit: ${report.limit}`);
  }
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  return lines;
}

/**
 * Convert a ReportResult into CSV text, prefixed with a metadata header so
 * the file makes sense standalone.
 */
export function reportToCSV(report: CustomReport, result: ReportResult): string {
  const header = describeReport(report).map((l) => `"${l.replace(/"/g, '""')}"`).join('\n');

  let body = '';
  switch (result.display) {
    case 'number': {
      const cols: CSVColumn[] = [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'context', label: 'Context' },
      ];
      const rows = [
        {
          metric: report.name,
          value: result.valueFormatted ?? String(result.value ?? ''),
          context: result.subtitle ?? '',
        },
      ];
      body = toCSV(cols, rows);
      break;
    }
    case 'bar':
    case 'pie':
    case 'donut': {
      const cols: CSVColumn[] = [
        { key: 'label', label: 'Group' },
        { key: 'value', label: 'Value' },
        { key: 'percent', label: 'Percent' },
      ];
      const total = (result.groups ?? []).reduce((s, g) => s + g.value, 0) || 1;
      const rows = (result.groups ?? []).map((g) => ({
        label: g.label,
        value: g.value,
        percent: `${Math.round((g.value / total) * 100)}%`,
      }));
      body = toCSV(cols, rows);
      break;
    }
    case 'table': {
      const cols: CSVColumn[] = (result.columns ?? []).map((c) => ({ key: c.key, label: c.label }));
      const rows = (result.rows ?? []).map((r) => {
        const out: Record<string, unknown> = {};
        for (const c of cols) {
          const raw = r[c.key];
          out[c.key] = raw == null ? '' : Array.isArray(raw) ? raw.join(', ') : raw;
        }
        return out;
      });
      body = toCSV(cols, rows);
      break;
    }
  }

  // Blank line between header and body
  return `${header}\n\n${body}`;
}

/**
 * Trigger a browser download of the report as a CSV file.
 */
export function downloadReportCSV(report: CustomReport, result: ReportResult) {
  const safeName = report.name.replace(/[^a-z0-9\-_ ]/gi, '_').slice(0, 60).trim() || 'report';
  const date = new Date().toISOString().slice(0, 10);
  const csv = reportToCSV(report, result);
  downloadCSV(`${safeName} — ${date}.csv`, csv);
}
