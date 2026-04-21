/**
 * CSV export utility. Generates a CSV string from an array of objects
 * and triggers a browser download.
 *
 * Used by the Reporting page to export pipeline data, revenue data,
 * contact lists, and deal lists as downloadable CSV files.
 */

export interface CSVColumn {
  key: string;
  label: string;
  /** Optional formatter — takes the raw value and returns a display string. */
  format?: (value: unknown) => string;
}

/**
 * Generate a CSV string from data rows.
 */
export function toCSV(columns: CSVColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const body = rows.map((row) =>
    columns.map((col) => {
      const raw = row[col.key];
      const val = col.format ? col.format(raw) : String(raw ?? '');
      // Escape quotes and wrap in quotes
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

/**
 * Trigger a browser download of a CSV file.
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: generate CSV from data and download it in one call.
 */
export function exportToCSV(filename: string, columns: CSVColumn[], rows: Record<string, unknown>[]) {
  const csv = toCSV(columns, rows);
  downloadCSV(filename, csv);
}
