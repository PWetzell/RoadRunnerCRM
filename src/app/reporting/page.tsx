'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { Sparkle, DownloadSimple, Printer, ArrowClockwise, CaretDown, FloppyDisk, Check, PencilSimple, Trash, Plus, FileCsv, FilePdf, Stack, X as XIcon } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { useReportingDashboardStore } from '@/stores/reporting-dashboard-store';
import GenericWidgetGrid from '@/components/dashboard/GenericWidgetGrid';
import { WidgetStoreProvider, WidgetStoreActions } from '@/components/dashboard/WidgetStoreContext';
import { exportToCSV } from '@/lib/csv-export';
import { REPORT_PRESETS } from '@/lib/report-presets';
import { WIDGET_META, WidgetCategory, WidgetType } from '@/types/dashboard';
import { getIcon } from '@/lib/phosphor-icons';
import ReportingPrintView from '@/components/reporting/ReportingPrintView';
import WidgetPreview from '@/components/dashboard/WidgetPreview';
import ReportLibrary from '@/components/reporting/ReportLibrary';
import ReportBuilderModal from '@/components/reporting/builder/ReportBuilderModal';
import CustomReportPrintView from '@/components/reporting/CustomReportPrintView';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { Funnel } from '@phosphor-icons/react';

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  status: 'Status / KPIs', reporting: 'Reporting', list: 'Lists', work: 'Work', custom: 'Custom Reports',
};

export default function ReportingPage() {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const insightsBars = useUserStore((s) => s.insightsBars);
  const aiEnabled = useUserStore((s) => s.aiEnabled);

  const views = useReportingDashboardStore((s) => s.views);
  const activeViewId = useReportingDashboardStore((s) => s.activeViewId);
  const setActiveViewId = useReportingDashboardStore((s) => s.setActiveViewId);

  // Manual hydration — pairs with `skipHydration: true` on the stores so we
  // avoid SSR/client state mismatches in Next.js.
  useEffect(() => {
    useReportingDashboardStore.persist.rehydrate();
    useCustomReportStore.persist.rehydrate();
  }, []);
  const activeView = views.find((v) => v.id === activeViewId);
  const storeWidgets = activeView?.widgets || [];

  // Dashboards vs. Reports tab switcher
  const [tab, setTab] = useState<'dashboards' | 'reports'>('dashboards');

  // Custom report library — shown in Add Widget and as a drop-in source
  const customReports = useCustomReportStore((s) => s.reports);
  const openBuilder = useCustomReportStore((s) => s.openBuilder);

  // Count instances of each widget type in the current view — used to
  // show "Already on dashboard" badges in the Add Widget dialog.
  const widgetCounts = storeWidgets.reduce<Record<string, number>>((acc, w) => {
    acc[w.type] = (acc[w.type] ?? 0) + 1;
    return acc;
  }, {});

  const reorderWidgets = useReportingDashboardStore((s) => s.reorderWidgets);
  const resizeWidget = useReportingDashboardStore((s) => s.resizeWidget);
  const removeWidget = useReportingDashboardStore((s) => s.removeWidget);
  const addWidget = useReportingDashboardStore((s) => s.addWidget);
  const setWidgetHeaderColor = useReportingDashboardStore((s) => s.setWidgetHeaderColor);
  const setWidgetStyle = useReportingDashboardStore((s) => s.setWidgetStyle);
  const updateWidgetConfig = useReportingDashboardStore((s) => s.updateWidgetConfig);
  const saveAsView = useReportingDashboardStore((s) => s.saveAsView);
  const renameView = useReportingDashboardStore((s) => s.renameView);
  const deleteView = useReportingDashboardStore((s) => s.deleteView);
  const mergeViews = useReportingDashboardStore((s) => s.mergeViews);
  const resetActiveView = useReportingDashboardStore((s) => s.resetActiveView);

  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  /** Inline rename for the *active* view — no per-row rename any more. */
  const [renamingActive, setRenamingActive] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  /** Pending delete — opens the confirm dialog. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  /** Merge dialog state. */
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [mergeName, setMergeName] = useState('');

  const viewRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewMenuOpen && !addMenuOpen && !exportMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewMenuOpen(false);
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddMenuOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [viewMenuOpen, addMenuOpen, exportMenuOpen]);

  const handleExportCSV = () => {
    exportToCSV('deals-report', [
      { key: 'name', label: 'Deal' }, { key: 'stage', label: 'Stage' },
      { key: 'amount', label: 'Amount', format: (v) => `$${Number(v).toLocaleString()}` },
      { key: 'source', label: 'Source' }, { key: 'owner', label: 'Owner' },
    ], deals.map((d) => ({ ...d })));
    setExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    setExportMenuOpen(false);
    // Use browser's native print → Save as PDF. The print CSS renders the
    // ReportingPrintView component for a report-formatted output.
    setTimeout(() => window.print(), 50);
  };

  const actions: WidgetStoreActions = useMemo(() => ({
    removeWidget, resizeWidget, setWidgetHeaderColor, setWidgetStyle, updateWidgetConfig,
  }), [removeWidget, resizeWidget, setWidgetHeaderColor, setWidgetStyle, updateWidgetConfig]);

  const stats = useMemo(() => {
    const won = deals.filter((d) => d.stage === 'closed-won');
    const lost = deals.filter((d) => d.stage === 'closed-lost');
    const open = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
    const weightedPipeline = open.reduce((s, d) => s + (d.amount * d.probability) / 100, 0);
    const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    return { winRate, weightedPipeline };
  }, [deals]);

  return (
    <>
      <Topbar title="Reporting" />
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-2 flex flex-col gap-3 items-start">
          {/* AI Summary */}
          {aiEnabled && insightsBars?.reporting && (
            <div data-tour="reporting-ai-summary" className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
              <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                <Sparkle size={13} weight="duotone" className="text-white" />
              </div>
              <div className="text-[13px] text-[var(--text-secondary)]">
                <strong className="font-extrabold text-[var(--text-primary)]">AI Report Summary</strong>
                <span> · {stats.winRate}% win rate · {fmtMoney(stats.weightedPipeline)} forecast</span>
              </div>
            </div>
          )}

          {/* Tab switcher — Report Dashboards vs Report Library
               Naming matches Salesforce/HubSpot/Monday: single reports live in the
               library; multi-chart packets live in dashboards. */}
          <div data-tour="reporting-tabs" className="inline-flex items-center gap-0 p-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
            {(['dashboards', 'reports'] as const).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`h-7 px-3 rounded text-[12px] font-bold transition-colors ${
                    active
                      ? 'bg-[var(--surface-card)] text-[var(--brand-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t === 'dashboards' ? 'Report Dashboards' : 'Report Library'}
                </button>
              );
            })}
          </div>

          {/* Toolbar — same pattern as main Dashboard toolbar */}
          {tab === 'dashboards' && (
          <div data-tour="reporting-kpis" className="flex items-center gap-2 flex-wrap min-h-[40px] w-full">
            {/* View picker — OR inline rename of the active view */}
            {renamingActive && activeView ? (
              <div className="inline-flex items-center gap-1">
                <input
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameVal.trim()) {
                      renameView(activeView.id, renameVal.trim());
                      setRenamingActive(false);
                    }
                    if (e.key === 'Escape') setRenamingActive(false);
                  }}
                  autoFocus
                  placeholder="New name"
                  className="h-8 px-3 text-[12px] font-bold bg-[var(--surface-card)] border border-[var(--brand-primary)] rounded-md text-[var(--text-primary)] outline-none shadow-[0_0_0_2px_var(--brand-primary-tint)] min-w-[240px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = renameVal.trim();
                    if (next && next !== activeView.name) renameView(activeView.id, next);
                    setRenamingActive(false);
                  }}
                  disabled={!renameVal.trim()}
                  aria-label="Save name"
                  title="Save (Enter)"
                  className="h-8 w-8 rounded flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  <Check size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingActive(false)}
                  aria-label="Cancel rename"
                  title="Cancel (Esc)"
                  className="h-8 w-8 rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] bg-transparent border border-[var(--border)] cursor-pointer"
                >
                  <XIcon size={14} weight="bold" />
                </button>
              </div>
            ) : (
            <div className="relative" ref={viewRef}>
              <button
                data-tour="reporting-views"
                onClick={() => setViewMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              >
                <FloppyDisk size={14} weight="bold" />
                View: {activeView?.name || 'Default'}
                <CaretDown size={10} weight="bold" />
              </button>

              {viewMenuOpen && (
                <div className="absolute left-0 top-10 z-50 w-[320px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 animate-[fadeUp_0.15s_ease-out]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">Report Views</div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {views.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { setActiveViewId(v.id); setViewMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-[12px] font-semibold text-left rounded-md bg-transparent border-none cursor-pointer ${
                          v.id === activeViewId ? 'text-[var(--brand-primary)] bg-[var(--brand-bg)]' : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
                        }`}
                      >
                        {v.id === activeViewId && <Check size={12} weight="bold" />}
                        <span className="truncate flex-1">{v.name}</span>
                        <span className="text-[9px] font-bold uppercase text-[var(--text-tertiary)]">
                          {v.preset ? 'Preset' : 'Custom'}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[var(--border-subtle)] mt-2 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">Save current as</div>
                    <div className="flex items-center gap-2 px-1.5">
                      <input value={newViewName} onChange={(e) => setNewViewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newViewName.trim()) { saveAsView(newViewName.trim()); setNewViewName(''); setViewMenuOpen(false); } }}
                        placeholder="View name" className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]" />
                      <button onClick={() => { if (newViewName.trim()) { saveAsView(newViewName.trim()); setNewViewName(''); setViewMenuOpen(false); } }}
                        className="h-7 px-2.5 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90">Save</button>
                    </div>
                  </div>

                  {/* Merge dashboards — combine widgets from 2+ user views */}
                  {views.filter((v) => !v.preset).length >= 2 && (
                    <div className="border-t border-[var(--border-subtle)] mt-2 pt-2 px-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMergeSelected(new Set());
                          setMergeName(`Merged dashboard — ${new Date().toLocaleDateString()}`);
                          setMergeOpen(true);
                          setViewMenuOpen(false);
                        }}
                        className="w-full inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-bg)]"
                      >
                        <Stack size={12} weight="fill" />
                        Merge dashboards…
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Rename / Delete for the active view — only for user-created (non-preset) views */}
            {!renamingActive && activeView && !activeView.preset && (
              <div data-tour="reporting-view-actions" className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => { setRenameVal(activeView.name); setRenamingActive(true); }}
                  title="Rename this dashboard"
                  aria-label="Rename dashboard"
                  className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border border-[var(--border)] cursor-pointer"
                >
                  <PencilSimple size={13} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(activeView.id)}
                  title="Delete this dashboard"
                  aria-label="Delete dashboard"
                  className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-tint)] bg-transparent border border-[var(--border)] cursor-pointer ml-1"
                >
                  <Trash size={13} weight="bold" />
                </button>
              </div>
            )}

            {/* Add widget */}
            <div className="relative" ref={addRef}>
              <button data-tour="reporting-add-widget" onClick={() => setAddMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border cursor-pointer transition-all text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)] hover:opacity-90">
                <Plus size={14} weight="bold" /> Add widget
              </button>
              {addMenuOpen && (
                <div className="absolute left-0 top-10 z-50 w-[420px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 max-h-[540px] overflow-y-auto animate-[fadeUp_0.15s_ease-out]">
                  {/* Custom Reports section — saved reports + New Report CTA */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between px-1.5 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{CATEGORY_LABELS.custom}</span>
                      <button
                        type="button"
                        onClick={() => { openBuilder(undefined, (rid) => { addWidget('custom-report', 'end', { reportId: rid }); }); setAddMenuOpen(false); }}
                        className="inline-flex items-center gap-1 h-5 px-2 rounded text-[10px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-tint)]"
                      >
                        <Plus size={10} weight="bold" />
                        New
                      </button>
                    </div>
                    {customReports.length === 0 ? (
                      <button
                        onClick={() => { openBuilder(undefined, (rid) => { addWidget('custom-report', 'end', { reportId: rid }); }); setAddMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md bg-transparent hover:bg-[var(--surface-raised)] cursor-pointer text-left border border-dashed border-[var(--border)]"
                      >
                        <Funnel size={22} weight="fill" className="text-[var(--brand-primary)]" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] font-bold text-[var(--text-primary)] block">Build a new report…</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">Open the Report Builder to create your first custom metric.</span>
                        </div>
                      </button>
                    ) : (
                      customReports.map((r) => {
                        const alreadyAdded = storeWidgets.some((w) => w.type === 'custom-report' && (w.config?.reportId as string | undefined) === r.id);
                        return (
                          <button
                            key={r.id}
                            disabled={alreadyAdded}
                            onClick={() => { if (alreadyAdded) return; addWidget('custom-report', 'end', { reportId: r.id }); setAddMenuOpen(false); }}
                            title={alreadyAdded ? 'Already on your dashboard' : r.description || 'Add to dashboard'}
                            aria-disabled={alreadyAdded}
                            className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-md border-none text-left ${alreadyAdded ? 'bg-[var(--success-bg)]/40 cursor-default' : 'bg-transparent hover:bg-[var(--surface-raised)] cursor-pointer'}`}
                          >
                            <div className={`flex-shrink-0 relative ${alreadyAdded ? 'opacity-80' : ''}`}>
                              <WidgetPreview type="custom-report" reportId={r.id} />
                              {alreadyAdded && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--success)] text-white flex items-center justify-center shadow-sm" aria-hidden="true">
                                  <Check size={10} weight="bold" />
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <span className={`text-[12px] font-bold ${alreadyAdded ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                                {r.name}
                              </span>
                              <span className="text-[10px] text-[var(--text-tertiary)] line-clamp-2">
                                {alreadyAdded ? 'Already on your dashboard' : (r.description || 'Custom report')}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {(['status', 'reporting', 'list', 'work'] as WidgetCategory[]).map((cat) => {
                    const items = WIDGET_META.filter((m) => m.category === cat);
                    if (!items.length) return null;
                    return (
                      <div key={cat} className="mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">{CATEGORY_LABELS[cat]}</div>
                        {items.map((m) => {
                          const alreadyAdded = (widgetCounts[m.type] ?? 0) > 0;
                          return (
                            <button
                              key={m.type}
                              disabled={alreadyAdded}
                              onClick={() => {
                                if (alreadyAdded) return;
                                addWidget(m.type as WidgetType);
                                setAddMenuOpen(false);
                              }}
                              title={alreadyAdded ? 'Already on your dashboard' : 'Add to dashboard'}
                              aria-disabled={alreadyAdded}
                              className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-md border-none text-left ${
                                alreadyAdded
                                  ? 'bg-[var(--success-bg)]/40 cursor-default'
                                  : 'bg-transparent hover:bg-[var(--surface-raised)] cursor-pointer'
                              }`}
                            >
                              <div className={`flex-shrink-0 relative ${alreadyAdded ? 'opacity-80' : ''}`}>
                                <WidgetPreview type={m.type as WidgetType} />
                                {alreadyAdded && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--success)] text-white flex items-center justify-center shadow-sm" aria-hidden="true">
                                    <Check size={10} weight="bold" />
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span className={`text-[12px] font-bold ${alreadyAdded ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                                  {m.label}
                                </span>
                                <span className="text-[10px] text-[var(--text-tertiary)]">
                                  {alreadyAdded ? 'Already on your dashboard' : m.description}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                data-tour="reporting-export"
                onClick={() => setExportMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              >
                <DownloadSimple size={14} weight="bold" /> Export
                <CaretDown size={10} weight="bold" />
              </button>
              {exportMenuOpen && (
                <div className="absolute left-0 top-10 z-[70] w-[280px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-1 animate-[fadeUp_0.15s_ease-out]">
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left"
                  >
                    <FilePdf size={16} weight="fill" className="text-[var(--danger)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text-primary)]">Download as PDF</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Formatted report with charts & metrics. Choose &ldquo;Save as PDF&rdquo; in the print dialog.</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-[var(--surface-raised)] bg-transparent border-none cursor-pointer text-left"
                  >
                    <FileCsv size={16} weight="fill" className="text-[var(--success)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-[var(--text-primary)]">Export deals as CSV</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Raw data for Excel, Google Sheets, or other tools.</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {activeView?.preset === false && (
              <button onClick={resetActiveView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                <ArrowClockwise size={14} weight="bold" /> Reset
              </button>
            )}

            <button data-tour="reporting-print" onClick={() => window.print()}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer hover:opacity-90">
              <Printer size={14} weight="bold" /> Print
            </button>

            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              {storeWidgets.length} widgets
            </span>
          </div>
          )}
        </div>

        {tab === 'dashboards' ? (
          <>
            <div data-tour="reporting-charts" className="px-5 pb-6">
              <WidgetStoreProvider actions={actions}>
                <GenericWidgetGrid widgets={storeWidgets} onReorder={reorderWidgets} />
              </WidgetStoreProvider>
            </div>

            {/* Print-only view — rendered for browser print dialog / Save as PDF.
                 Uses the active view's widgets so customizations (colors, titles,
                 font sizes, chart type) are reflected in the printed report. */}
            <div className="reporting-print-host">
              <ReportingPrintView
                viewName={activeView?.name || 'Sales Report'}
                widgets={storeWidgets}
                deals={deals}
                contacts={contacts}
              />
            </div>
          </>
        ) : (
          <div className="px-5 pb-6">
            <ReportLibrary onSwitchToDashboardsTab={() => setTab('dashboards')} />
          </div>
        )}
      </div>

      {/* Report Builder — mounted once at the page level so anything can open it */}
      <ReportBuilderModal />

      {/* Custom-report print view — renders off-screen, revealed only in print */}
      <div className="custom-report-print-host">
        <CustomReportPrintView />
      </div>

      {/* Confirm dialog for deleting a user dashboard view */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete dashboard?"
        message={(() => {
          const v = views.find((x) => x.id === confirmDeleteId);
          const widgetCount = v?.widgets.length ?? 0;
          return v
            ? `This will permanently delete "${v.name}" and its ${widgetCount} widget${widgetCount === 1 ? '' : 's'}. The underlying reports in the library are not affected.`
            : '';
        })()}
        confirmLabel="Delete dashboard"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDeleteId) deleteView(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Merge dashboards modal */}
      {mergeOpen && (
        <div
          className="fixed inset-0 z-[180] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setMergeOpen(false); }}
        >
          <div className="bg-[var(--surface-card)] rounded-xl shadow-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border)]">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)]">
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Merge dashboards</div>
                <div className="text-[16px] font-extrabold text-[var(--text-primary)]">Pick dashboards to combine</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  All widgets from the selected dashboards will be copied into a new dashboard. Duplicate reports and repeated built-in widgets are collapsed to one copy.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMergeOpen(false)}
                aria-label="Close"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)]"
              >
                <XIcon size={16} weight="bold" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-2">
              {views.filter((v) => !v.preset).map((v) => {
                const on = mergeSelected.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(mergeSelected);
                      if (next.has(v.id)) next.delete(v.id); else next.add(v.id);
                      setMergeSelected(next);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-3 ${
                      on
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-tint)]'
                        : 'border-[var(--border)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                      on ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white' : 'border-[var(--border)]'
                    }`}>
                      {on && <Check size={12} weight="bold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-extrabold text-[var(--text-primary)] truncate">{v.name}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">{v.widgets.length} widget{v.widgets.length === 1 ? '' : 's'}</div>
                    </div>
                  </button>
                );
              })}
              {views.filter((v) => !v.preset).length === 0 && (
                <div className="text-[12px] italic text-[var(--text-tertiary)] text-center py-6">
                  No user dashboards to merge yet. Save a view first.
                </div>
              )}
            </div>
            <div className="border-t border-[var(--border)] p-4 flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                New dashboard name
              </label>
              <input
                type="text"
                value={mergeName}
                onChange={(e) => setMergeName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && mergeName.trim() && mergeSelected.size >= 2) { mergeViews(mergeName.trim(), Array.from(mergeSelected)); setMergeOpen(false); } }}
                placeholder="e.g. All report packets"
                className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[13px] font-semibold text-[var(--text-primary)]"
              />
              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMergeOpen(false)}
                  className="h-9 px-4 rounded-lg text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mergeSelected.size < 2 || !mergeName.trim()}
                  onClick={() => {
                    mergeViews(mergeName.trim(), Array.from(mergeSelected));
                    setMergeOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Stack size={14} weight="fill" />
                  Merge {mergeSelected.size >= 2 ? `(${mergeSelected.size})` : '…'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
