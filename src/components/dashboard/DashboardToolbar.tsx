'use client';

import { useState, useRef, useEffect } from 'react';
import { CaretDown, Plus, FloppyDisk, Trash, ArrowClockwise, Check, PencilSimple, Funnel, X as XIcon } from '@phosphor-icons/react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { WIDGET_META, WidgetCategory, WidgetType, InsertPosition } from '@/types/dashboard';
import WidgetPreview from './WidgetPreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  status: 'Status / KPIs',
  reporting: 'Reporting',
  list: 'Lists',
  work: 'Work',
  custom: 'Custom Reports',
};

/**
 * Toolbar for the dashboard page. Holds:
 * - View picker (switch + save/rename/delete)
 * - Add widget dropdown (grouped by category)
 * - Customize toggle (turns on drag handles, resize, remove)
 * - Widget count
 */
export default function DashboardToolbar() {
  const views = useDashboardStore((s) => s.views);
  const activeViewId = useDashboardStore((s) => s.activeViewId);
  const setActiveViewId = useDashboardStore((s) => s.setActiveViewId);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const saveAsView = useDashboardStore((s) => s.saveAsView);
  const renameView = useDashboardStore((s) => s.renameView);
  const deleteView = useDashboardStore((s) => s.deleteView);
  const resetActiveView = useDashboardStore((s) => s.resetActiveView);

  const active = views.find((v) => v.id === activeViewId);
  const widgetCount = active?.widgets.length ?? 0;

  // Custom reports — shown as a dedicated section in Add Widget
  const customReports = useCustomReportStore((s) => s.reports);
  const openBuilder = useCustomReportStore((s) => s.openBuilder);

  // Map of widget type → count of instances in the current view
  // Used to show "Already added" badges in the Add Widget menu.
  const widgetCounts = (active?.widgets ?? []).reduce<Record<string, number>>((acc, w) => {
    acc[w.type] = (acc[w.type] ?? 0) + 1;
    return acc;
  }, {});

  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  /** Inline rename for the *active* view — no per-row rename any more. */
  const [renamingActive, setRenamingActive] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [confirmDeleteViewId, setConfirmDeleteViewId] = useState<string | null>(null);

  // Where newly added widgets should land
  type PositionMode = 'end' | 'start' | 'after';
  const [positionMode, setPositionMode] = useState<PositionMode>('end');
  const [positionAfterId, setPositionAfterId] = useState<string>('');

  const viewRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewMenuOpen && !addMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewMenuOpen(false);
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [viewMenuOpen, addMenuOpen]);

  const handleSave = () => {
    const name = newViewName.trim();
    if (!name) return;
    saveAsView(name);
    setNewViewName('');
    setViewMenuOpen(false);
  };

  const handleRenameActive = () => {
    if (!active) return;
    const name = renameVal.trim();
    if (!name) return;
    renameView(active.id, name);
    setRenamingActive(false);
    setRenameVal('');
  };

  const pendingDeleteView = views.find((v) => v.id === confirmDeleteViewId);

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-h-[26px]">
      {/* Inline rename of the active view */}
      {renamingActive && active && (
        <div className="inline-flex items-center gap-1">
          <input
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameActive();
              if (e.key === 'Escape') { setRenamingActive(false); setRenameVal(''); }
            }}
            autoFocus
            placeholder="New name"
            className="h-[26px] px-2 text-[10px] font-bold bg-[var(--surface-card)] border border-[var(--brand-primary)] rounded-md text-[var(--text-primary)] outline-none shadow-[0_0_0_2px_var(--brand-primary-tint)] min-w-[240px]"
          />
          <button
            type="button"
            onClick={handleRenameActive}
            disabled={!renameVal.trim()}
            aria-label="Save name"
            title="Save (Enter)"
            className="h-[26px] w-[26px] rounded flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
            style={{ background: 'var(--brand-primary)' }}
          >
            <Check size={12} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => { setRenamingActive(false); setRenameVal(''); }}
            aria-label="Cancel rename"
            title="Cancel (Esc)"
            className="h-[26px] w-[26px] rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] bg-transparent border border-[var(--border)] cursor-pointer"
          >
            <XIcon size={12} weight="bold" />
          </button>
        </div>
      )}

      {/* View picker — hidden while renaming */}
      {!renamingActive && (
      <div className="relative" ref={viewRef}>
        <button
          data-tour="dashboard-view-picker"
          onClick={() => setViewMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <FloppyDisk size={14} weight="bold" />
          View: {active?.name || 'Default'}
          <CaretDown size={10} weight="bold" />
        </button>

        {viewMenuOpen && (
          <div className="absolute left-0 top-8 z-50 w-[280px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 animate-[fadeUp_0.15s_ease-out]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">Switch view</div>
            <div className="max-h-[200px] overflow-y-auto">
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">
                Save current as
              </div>
              <div className="flex items-center gap-2 px-1.5">
                <input
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="View name"
                  className="flex-1 h-7 px-2 text-[12px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                />
                <button
                  onClick={handleSave}
                  className="h-7 px-2.5 text-[11px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90"
                >
                  Save
                </button>
              </div>
              {active?.preset && (
                <div className="px-1.5 pt-2 text-[10px] text-[var(--text-tertiary)]">
                  Editing a preset creates a new user view when you save.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Rename / Delete for the active view — only for user-created (non-preset) views */}
      {!renamingActive && active && !active.preset && (
        <div className="inline-flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => { setRenameVal(active.name); setRenamingActive(true); }}
            title="Rename this dashboard"
            aria-label="Rename dashboard"
            className="h-[26px] w-[26px] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-bg)] bg-transparent border border-[var(--border)] cursor-pointer"
          >
            <PencilSimple size={12} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteViewId(active.id)}
            title="Delete this dashboard"
            aria-label="Delete dashboard"
            className="h-[26px] w-[26px] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-tint)] bg-transparent border border-[var(--border)] cursor-pointer ml-1"
          >
            <Trash size={12} weight="bold" />
          </button>
        </div>
      )}

      {/* Add widget */}
      <div className="relative" ref={addRef}>
        <button
          onClick={() => setAddMenuOpen((v) => !v)}
          data-tour="dashboard-add-widget"
          title="Add widget"
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md border cursor-pointer transition-all text-[var(--brand-primary)] bg-[var(--brand-bg)] border-[var(--brand-primary)] hover:opacity-90"
        >
          <Plus size={14} weight="bold" /> Add widget
        </button>

        {addMenuOpen && (
          <div className="absolute left-0 top-8 z-50 w-[420px] bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 max-h-[540px] overflow-y-auto animate-[fadeUp_0.15s_ease-out]">
            {/* Position picker */}
            <div className="mb-2 pb-2 border-b border-[var(--border-subtle)]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">
                Insert at
              </div>
              <div className="flex gap-1 px-1.5 mb-1">
                {(['end', 'start', 'after'] as PositionMode[]).map((mode) => {
                  const isActive = positionMode === mode;
                  const label = mode === 'end' ? 'End' : mode === 'start' ? 'Start' : 'After…';
                  return (
                    <button
                      key={mode}
                      onClick={() => setPositionMode(mode)}
                      className={`flex-1 h-7 text-[11px] font-bold rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                          : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {positionMode === 'after' && (
                <div className="px-1.5">
                  <select
                    value={positionAfterId}
                    onChange={(e) => setPositionAfterId(e.target.value)}
                    className="w-full h-7 px-2 text-[11px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  >
                    <option value="">Choose a widget…</option>
                    {(active?.widgets || []).map((w) => {
                      const meta = WIDGET_META.find((m) => m.type === w.type);
                      return (
                        <option key={w.id} value={w.id}>
                          {w.title || meta?.label || w.type}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Custom Reports section — at the top, above built-in widgets */}
            <div className="mb-2">
              <div className="flex items-center justify-between px-1.5 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{CATEGORY_LABELS.custom}</span>
                <button
                  type="button"
                  onClick={() => {
                    openBuilder(undefined, (rid) => {
                      const pos: InsertPosition =
                        positionMode === 'start' ? 'start'
                        : positionMode === 'after' && positionAfterId ? { afterId: positionAfterId }
                        : 'end';
                      addWidget('custom-report', pos, { reportId: rid });
                    });
                    setAddMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 h-5 px-2 rounded text-[10px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-tint)]"
                >
                  <Plus size={10} weight="bold" />
                  New
                </button>
              </div>
              {customReports.length === 0 ? (
                <button
                  onClick={() => {
                    openBuilder(undefined, (rid) => {
                      const pos: InsertPosition =
                        positionMode === 'start' ? 'start'
                        : positionMode === 'after' && positionAfterId ? { afterId: positionAfterId }
                        : 'end';
                      addWidget('custom-report', pos, { reportId: rid });
                    });
                    setAddMenuOpen(false);
                  }}
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
                  const alreadyAdded = (active?.widgets ?? []).some(
                    (w) => w.type === 'custom-report' && (w.config?.reportId as string | undefined) === r.id
                  );
                  const positionDisabled = positionMode === 'after' && !positionAfterId;
                  const disabled = positionDisabled || alreadyAdded;
                  return (
                    <button
                      key={r.id}
                      disabled={disabled}
                      onClick={() => {
                        if (alreadyAdded) return;
                        const pos: InsertPosition =
                          positionMode === 'start' ? 'start'
                          : positionMode === 'after' ? { afterId: positionAfterId }
                          : 'end';
                        addWidget('custom-report', pos, { reportId: r.id });
                        setAddMenuOpen(false);
                      }}
                      title={alreadyAdded ? 'Already on your dashboard' : (r.description || 'Add to dashboard')}
                      aria-disabled={disabled}
                      className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-md border-none text-left ${
                        positionDisabled
                          ? 'bg-transparent opacity-40 cursor-not-allowed'
                          : alreadyAdded
                          ? 'bg-[var(--success-bg)]/40 cursor-default'
                          : 'bg-transparent hover:bg-[var(--surface-raised)] cursor-pointer'
                      }`}
                    >
                      <div className={`flex-shrink-0 relative ${alreadyAdded ? 'opacity-80' : ''}`}>
                        <WidgetPreview type="custom-report" reportId={r.id} />
                        {alreadyAdded && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--tag-success-bg)] text-white flex items-center justify-center shadow-sm" aria-hidden="true">
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
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1.5 pb-1">
                    {CATEGORY_LABELS[cat]}
                  </div>
                  {items.map((m) => {
                    const positionDisabled = positionMode === 'after' && !positionAfterId;
                    const alreadyAdded = (widgetCounts[m.type] ?? 0) > 0;
                    const disabled = positionDisabled || alreadyAdded;
                    return (
                      <button
                        key={m.type}
                        disabled={disabled}
                        onClick={() => {
                          if (alreadyAdded) return;
                          const pos: InsertPosition =
                            positionMode === 'start'
                              ? 'start'
                              : positionMode === 'after'
                              ? { afterId: positionAfterId }
                              : 'end';
                          addWidget(m.type as WidgetType, pos);
                          setAddMenuOpen(false);
                        }}
                        title={alreadyAdded ? 'Already on your dashboard' : 'Add to dashboard'}
                        aria-disabled={disabled}
                        className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-md text-left border-none ${
                          positionDisabled
                            ? 'bg-transparent opacity-40 cursor-not-allowed'
                            : alreadyAdded
                            ? 'bg-[var(--success-bg)]/40 cursor-default'
                            : 'bg-transparent hover:bg-[var(--surface-raised)] cursor-pointer'
                        }`}
                      >
                        <div className={`flex-shrink-0 relative ${alreadyAdded ? 'opacity-80' : ''}`}>
                          <WidgetPreview type={m.type as WidgetType} />
                          {alreadyAdded && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--tag-success-bg)] text-white flex items-center justify-center shadow-sm" aria-hidden="true">
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

            {positionMode === 'after' && !positionAfterId && (
              <div className="text-[10px] text-[var(--warning)] font-semibold px-1.5 py-1">
                Pick a target widget above to enable Insert.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset only available for user-created views */}
      {active?.preset === false && (
        <button
          onClick={resetActiveView}
          title="Reset this view to its preset defaults (if it was based on one)"
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-md cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        >
          <ArrowClockwise size={14} weight="bold" /> Reset
        </button>
      )}

      <span className="ml-auto text-[11px] font-semibold text-[var(--text-tertiary)]">
        {widgetCount} {widgetCount === 1 ? 'widget' : 'widgets'}
      </span>

      <ConfirmDialog
        open={!!confirmDeleteViewId}
        title="Delete dashboard?"
        message={
          pendingDeleteView
            ? `This will permanently delete "${pendingDeleteView.name}" and its ${pendingDeleteView.widgets.length} widget${pendingDeleteView.widgets.length === 1 ? '' : 's'}.`
            : ''
        }
        confirmLabel="Delete dashboard"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmDeleteViewId) deleteView(confirmDeleteViewId);
          setConfirmDeleteViewId(null);
        }}
        onCancel={() => setConfirmDeleteViewId(null)}
      />
    </div>
  );
}
