'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Funnel, TrendUp, ChartBar, ChartPieSlice, ChartDonut, Table,
  PencilSimple, Copy, Trash, MagnifyingGlass, Printer,
  Check, X as XIcon, Stack, DotsThreeVertical, FileCsv, Sparkle, CaretDown,
} from '@phosphor-icons/react';
import ReportMiniPreview from './ReportMiniPreview';
import {
  CustomReport,
  ReportDisplay,
  SOURCE_LABELS,
  DISPLAY_LABELS,
} from '@/types/custom-report';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useReportingDashboardStore } from '@/stores/reporting-dashboard-store';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { runReport } from '@/lib/custom-report-engine';
import { downloadReportCSV } from '@/lib/custom-report-export';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PrintPreviewModal from './PrintPreviewModal';

const DISPLAY_ICONS = {
  number: TrendUp,
  bar:    ChartBar,
  pie:    ChartPieSlice,
  donut:  ChartDonut,
  table:  Table,
} as const;

const DISPLAY_ACCENTS: Record<ReportDisplay, string> = {
  number: '#0E7490',
  bar:    '#1955A6',
  pie:    '#7C3AED',
  donut:  '#5B21B6',
  table:  '#475569',
};

interface Props {
  /** Called when the user clicks "Compose dashboard" — parent should switch
   *  to the Dashboards tab so they can see the newly-created view. */
  onSwitchToDashboardsTab?: () => void;
}

/**
 * Saved Report Library — Reports tab on the Reporting page.
 *
 * Capabilities:
 *  - Search + source filter + display-type filter
 *  - Print / Export CSV per report
 *  - Print All — prints every filtered report on one multi-page PDF packet
 *  - Multi-select → Compose new Report Dashboard
 *  - Usage badge — shows how many dashboards each report is live on
 */
export default function ReportLibrary({ onSwitchToDashboardsTab }: Props) {
  const reports = useCustomReportStore((s) => s.reports);
  const openBuilder = useCustomReportStore((s) => s.openBuilder);
  const duplicateReport = useCustomReportStore((s) => s.duplicateReport);
  const deleteReport = useCustomReportStore((s) => s.deleteReport);

  // Entity data for on-the-fly CSV export
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);

  // Dashboard stores — used to compute "Used on X dashboards" badge
  const mainViews = useDashboardStore((s) => s.views);
  const reportingViews = useReportingDashboardStore((s) => s.views);
  const composeViewFromReports = useReportingDashboardStore((s) => s.composeViewFromReports);

  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | CustomReport['source']>('all');
  const [confirmDelete, setConfirmDelete] = useState<CustomReport | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composeNameOpen, setComposeNameOpen] = useState(false);
  const [composeName, setComposeName] = useState('');

  // Print preview state — opened before the actual window.print()
  const [previewIds, setPreviewIds] = useState<string[] | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [reports, query, sourceFilter]);

  /**
   * For every report, list the distinct dashboards it appears on. Count is
   * always `dashboardNames.length` so the UI never shows "Live on 2
   * dashboards" while only listing one name (happens when a report appears
   * multiple times on the same dashboard).
   */
  const usageByReportId = useMemo(() => {
    const usage: Record<string, { count: number; dashboardNames: string[] }> = {};
    function scan(views: { name: string; widgets: { type: string; config?: Record<string, unknown> }[] }[]) {
      for (const v of views) {
        for (const w of v.widgets) {
          if (w.type !== 'custom-report') continue;
          const rid = w.config?.reportId as string | undefined;
          if (!rid) continue;
          if (!usage[rid]) usage[rid] = { count: 0, dashboardNames: [] };
          if (!usage[rid].dashboardNames.includes(v.name)) {
            usage[rid].dashboardNames.push(v.name);
          }
        }
      }
    }
    scan(mainViews);
    scan(reportingViews);
    // Count = distinct dashboard count
    for (const rid in usage) usage[rid].count = usage[rid].dashboardNames.length;
    return usage;
  }, [mainViews, reportingViews]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  /** Open the preview modal — user confirms before actual print. */
  function handlePrint(id: string) {
    setPreviewIds([id]);
  }

  function handlePrintAll() {
    if (filtered.length === 0) return;
    setPreviewIds(filtered.map((r) => r.id));
  }

  function handlePrintSelected() {
    if (selectedIds.size === 0) return;
    setPreviewIds(Array.from(selectedIds));
  }

  function handleExportCSV(report: CustomReport) {
    const result = runReport(report, { deals, contacts, documents });
    downloadReportCSV(report, result);
  }

  function handleCompose() {
    const suggested = `Report packet — ${new Date().toLocaleDateString()}`;
    setComposeName(suggested);
    setComposeNameOpen(true);
  }

  function confirmCompose() {
    const name = composeName.trim();
    if (!name || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    composeViewFromReports(name, ids);
    setComposeNameOpen(false);
    clearSelection();
    onSwitchToDashboardsTab?.();
  }

  const selectionMode = selectedIds.size > 0;

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Intro hint — templates buyers understand the two-tier model immediately */}
      <div className="bg-[var(--brand-primary-tint)] border border-[var(--brand-primary)]/20 rounded-lg px-4 py-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0">
          <Sparkle size={14} weight="fill" />
        </div>
        <div className="flex-1 text-[12px] leading-snug text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)] font-extrabold">Reports are reusable single-metric blocks.</strong>{' '}
          Print or export any report standalone, or drop several onto a{' '}
          <button
            type="button"
            onClick={() => onSwitchToDashboardsTab?.()}
            className="underline font-bold text-[var(--brand-primary)] hover:brightness-110"
          >
            Report Dashboard
          </button>{' '}
          to create a multi-chart packet (e.g. a weekly sales review).
        </div>
      </div>

      {/* Toolbar */}
      <div data-tour="reporting-library-toolbar" className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" weight="bold" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[12px] text-[var(--text-primary)]"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'deals', 'contacts', 'documents', 'cross-object'] as const).map((s) => {
            const active = sourceFilter === s;
            const label = s === 'all' ? 'All' : SOURCE_LABELS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={`h-8 px-3 rounded-full text-[11px] font-bold border transition-colors ${
                  active
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                    : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handlePrintAll}
              title={`Print all ${filtered.length} report${filtered.length === 1 ? '' : 's'} as one PDF packet`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            >
              <Printer size={14} weight="bold" />
              Print all
            </button>
          )}

          <button
            type="button"
            onClick={() => openBuilder()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110 transition-all"
          >
            <Plus size={14} weight="bold" />
            New Report
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState hasQuery={!!query || sourceFilter !== 'all'} onNew={() => openBuilder()} />
      ) : (
        <div data-tour="reporting-library-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              usage={usageByReportId[r.id]}
              selected={selectedIds.has(r.id)}
              selectionMode={selectionMode}
              onToggleSelect={() => toggleSelect(r.id)}
              onEdit={() => openBuilder(r.id)}
              onDuplicate={() => duplicateReport(r.id)}
              onDelete={() => setConfirmDelete(r)}
              onPrint={() => handlePrint(r.id)}
              onExportCSV={() => handleExportCSV(r)}
            />
          ))}
        </div>
      )}

      {/* Floating action bar for multi-select */}
      {selectionMode && (
        <div
          role="region"
          aria-label="Selection actions"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-2xl p-2 pl-4 flex items-center gap-3 animate-[fadeUp_0.2s_ease-out]"
        >
          <span className="text-[12px] font-extrabold text-[var(--text-primary)]">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={handleCompose}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110"
          >
            <Stack size={14} weight="fill" />
            Compose dashboard
          </button>
          <button
            type="button"
            onClick={handlePrintSelected}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
          >
            <Printer size={14} weight="bold" />
            Print selected
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)]"
            aria-label="Clear selection"
          >
            <XIcon size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete report?"
        message={
          confirmDelete
            ? `This will permanently delete "${confirmDelete.name}". ${
                usageByReportId[confirmDelete.id]?.count
                  ? `Used on ${usageByReportId[confirmDelete.id].count} dashboard${usageByReportId[confirmDelete.id].count === 1 ? '' : 's'} — those widgets will show a placeholder.`
                  : 'It is not currently on any dashboard.'
              }`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDelete) deleteReport(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Print preview — always mounted, opens when previewIds is set */}
      <PrintPreviewModal
        open={!!previewIds && previewIds.length > 0}
        reportIds={previewIds ?? []}
        onClose={() => setPreviewIds(null)}
      />

      {/* Compose dashboard name prompt */}
      {composeNameOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setComposeNameOpen(false); }}
        >
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-[440px] p-5 flex flex-col gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                New Report Dashboard
              </div>
              <div className="text-[16px] font-extrabold text-[var(--text-primary)] mt-1">
                Name your dashboard
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
                Will include {selectedIds.size} report{selectedIds.size === 1 ? '' : 's'} — you can rearrange, resize, and print once it&apos;s open.
              </div>
            </div>
            <input
              type="text"
              value={composeName}
              onChange={(e) => setComposeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmCompose(); if (e.key === 'Escape') setComposeNameOpen(false); }}
              autoFocus
              placeholder="e.g. Monday Sales Review"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[13px] font-semibold text-[var(--text-primary)]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setComposeNameOpen(false)}
                className="h-9 px-4 rounded-lg text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCompose}
                disabled={!composeName.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110 disabled:opacity-40"
              >
                <Stack size={14} weight="fill" />
                Create dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

function ReportCard({
  report,
  usage,
  selected,
  selectionMode,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onPrint,
  onExportCSV,
}: {
  report: CustomReport;
  usage?: { count: number; dashboardNames: string[] };
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onExportCSV: () => void;
}) {
  const Icon = DISPLAY_ICONS[report.display];
  const accent = DISPLAY_ACCENTS[report.display];
  const [menuOpen, setMenuOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click — reliable regardless of focus behavior
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (moreBtnRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <div
      className={`relative bg-[var(--surface-card)] border rounded-xl p-4 flex flex-col gap-3 transition-all group ${
        menuOpen ? 'z-30' : ''
      } ${
        selected
          ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/30 shadow-md'
          : 'border-[var(--border)] hover:shadow-md hover:border-[var(--brand-primary)]'
      }`}
    >
      {/* Selection checkbox — absolute top-right, overlaps the kebab space
          only during selection mode. Hover-revealed otherwise. */}
      <button
        type="button"
        onClick={onToggleSelect}
        aria-label={selected ? 'Deselect report' : 'Select report'}
        aria-pressed={selected}
        className={`absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center border-2 transition-all z-10 ${
          selected
            ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
            : selectionMode
            ? 'bg-[var(--surface-raised)] border-[var(--border)] hover:border-[var(--brand-primary)]'
            : 'bg-[var(--surface-card)] border-[var(--border)] opacity-0 group-hover:opacity-100 hover:border-[var(--brand-primary)]'
        }`}
      >
        {selected && <Check size={12} weight="bold" />}
      </button>

      {/* Header — icon + title + badges on the left, kebab menu on the right */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}22`, color: accent }}
        >
          <Icon size={20} weight="fill" />
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <div className="text-[13px] font-extrabold text-[var(--text-primary)] truncate">{report.name}</div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <SourceBadge source={report.source} />
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              {DISPLAY_LABELS[report.display]}
            </span>
          </div>
        </div>
        {/* Kebab menu — sits just left of the checkbox slot.
             Menu is absolutely positioned right below the button so it
             always feels attached, regardless of viewport or scroll. */}
        <div className="absolute top-3 right-10">
          <button
            ref={moreBtnRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          >
            <DotsThreeVertical size={16} weight="bold" />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-8 w-[160px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-xl p-1 z-[200] animate-[fadeUp_0.12s_ease-out]"
            >
              <MenuItem icon={PencilSimple} label="Edit" onClick={() => { setMenuOpen(false); onEdit(); }} />
              <MenuItem icon={Copy} label="Duplicate" onClick={() => { setMenuOpen(false); onDuplicate(); }} />
              <div className="my-1 border-t border-[var(--border)]" />
              <MenuItem icon={Trash} label="Delete" onClick={() => { setMenuOpen(false); onDelete(); }} danger />
            </div>
          )}
        </div>
      </div>

      {/* Live mini-preview of the report's actual current data */}
      <ReportMiniPreview report={report} />

      {/* Description */}
      {report.description && (
        <p className="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2">{report.description}</p>
      )}

      {/* Usage badge — always shown. Click opens the full locations list. */}
      <UsageBadge count={usage?.count ?? 0} dashboardNames={usage?.dashboardNames ?? []} />


      {/* Footer — right-aligned secondary actions */}
      <div className="flex items-center justify-end gap-1.5 mt-auto pt-2 border-t border-[var(--border)]">
        <SmallButton icon={FileCsv} label="CSV" onClick={onExportCSV} />
        <SmallButton icon={Printer} label="Print" onClick={onPrint} accent />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small compact button — reusable in dialogs + card footers          */
/* ------------------------------------------------------------------ */

function SmallButton({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; weight?: 'bold' | 'fill' | 'regular'; className?: string }>;
  label: string;
  onClick: () => void;
  /** Uses brand accent outline — slightly stronger visual weight than default. */
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-bold border transition-colors ${
        accent
          ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]/40 bg-[var(--brand-primary-tint)] hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)]'
          : 'text-[var(--text-secondary)] border-[var(--border)] bg-[var(--surface-card)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon size={12} weight={accent ? 'fill' : 'bold'} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Usage badge with popover                                           */
/* ------------------------------------------------------------------ */

/**
 * Always-visible usage indicator on each library card.
 *
 * Three states:
 *   - 0 dashboards → neutral gray "Not on any dashboard"
 *   - ≥ 1 dashboard → success green "Live on N dashboard(s)"
 *
 * Clickable — opens a persistent popover with the full list. If ≥ 1 is
 * shown, the button gets a caret hint. The popover is scrollable when
 * the list is long (e.g. 10+ dashboards).
 */
function UsageBadge({ count, dashboardNames }: { count: number; dashboardNames: string[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Click-outside closes the popover
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isLive = count > 0;
  const label = count === 0
    ? 'Not on any dashboard'
    : `Live on ${count} dashboard${count === 1 ? '' : 's'}`;

  return (
    <div className="relative self-start">
      <button
        ref={btnRef}
        type="button"
        onClick={() => isLive && setOpen((v) => !v)}
        aria-haspopup={isLive ? 'dialog' : undefined}
        aria-expanded={isLive ? open : undefined}
        aria-label={isLive ? `${label} — click to see which` : label}
        disabled={!isLive}
        className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[10px] font-bold transition-colors ${
          isLive
            ? 'bg-[var(--success-bg)] text-[var(--success)] hover:brightness-105 cursor-pointer'
            : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] border border-[var(--border)] cursor-default'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isLive ? 'bg-[var(--success)]' : 'bg-[var(--text-tertiary)]'
          }`}
        />
        {label}
        {isLive && (
          <CaretDown size={9} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && isLive && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Dashboards using this report"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-w-[300px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-xl animate-[fadeUp_0.12s_ease-out] overflow-hidden"
        >
          <div className="px-3 pt-2.5 pb-1.5 border-b border-[var(--border)]">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">
              In use on
            </div>
            <div className="text-[12px] font-extrabold text-[var(--text-primary)]">
              {count} dashboard{count === 1 ? '' : 's'}
            </div>
          </div>
          <ul
            className="flex flex-col max-h-[220px] overflow-y-auto py-1"
            role="list"
          >
            {dashboardNames.map((n) => (
              <li key={n}>
                <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]">
                  <Stack size={12} weight="fill" className="text-[var(--brand-primary)] flex-shrink-0" />
                  <span className="truncate flex-1">{n}</span>
                </div>
              </li>
            ))}
          </ul>
          {count > 5 && (
            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] border-t border-[var(--border)] bg-[var(--surface-raised)]">
              Scroll to see all {count}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, danger,
}: {
  icon: React.ComponentType<{ size?: number; weight?: 'bold' | 'fill' | 'regular'; className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 h-8 px-2 rounded text-[12px] font-bold text-left ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-tint)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
      }`}
    >
      <Icon size={13} weight="bold" />
      {label}
    </button>
  );
}

function SourceBadge({ source }: { source: CustomReport['source'] }) {
  const colors: Record<CustomReport['source'], { bg: string; fg: string }> = {
    deals:          { bg: '#DBEAFE', fg: '#0B2F5C' },
    contacts:       { bg: '#EDE9FE', fg: '#5B21B6' },
    documents:      { bg: '#CFFAFE', fg: '#0E7490' },
    'cross-object': { bg: '#FCE7F3', fg: '#9D174D' },
  };
  const c = colors[source];
  return (
    <span
      className="inline-flex items-center h-4 px-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ hasQuery, onNew }: { hasQuery: boolean; onNew: () => void }) {
  return (
    <div className="bg-[var(--surface-card)] border border-dashed border-[var(--border)] rounded-xl p-10 text-center">
      <div
        className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)' }}
      >
        <Funnel size={24} weight="fill" />
      </div>
      {hasQuery ? (
        <>
          <p className="text-[13px] font-bold text-[var(--text-secondary)] mb-1">No reports match</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">Try a different search or source filter.</p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-bold text-[var(--text-secondary)] mb-1">No custom reports yet</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">
            Build your first report to print, export, or add to any dashboard.
          </p>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110"
          >
            <Plus size={14} weight="bold" />
            New Report
          </button>
        </>
      )}
    </div>
  );
}
