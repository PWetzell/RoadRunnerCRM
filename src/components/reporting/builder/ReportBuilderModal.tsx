'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, FloppyDisk, Trash } from '@phosphor-icons/react';
import { CustomReport } from '@/types/custom-report';
import { useCustomReportStore } from '@/stores/custom-report-store';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ReportBuilderForm from './ReportBuilderForm';
import ReportBuilderPreview from './ReportBuilderPreview';

/**
 * Large two-column modal for creating / editing a Custom Report.
 *
 * Left column: form (source / aggregation / field / filters / display / group by)
 * Right column: live preview of the result
 *
 * Mounted once globally (typically on the Reporting page) and opened via
 * the custom-report-store's `openBuilder(id?, onSave?)` action.
 */

const EMPTY_DRAFT: CustomReport = {
  id: '',
  name: '',
  description: '',
  source: 'deals',
  aggregation: 'count',
  filters: [],
  display: 'number',
  createdAt: '',
  updatedAt: '',
};

export default function ReportBuilderModal() {
  const open = useCustomReportStore((s) => s.builderOpen);
  const editingId = useCustomReportStore((s) => s.editingReportId);
  const onSaveCallback = useCustomReportStore((s) => s.onSaveCallback);
  const reports = useCustomReportStore((s) => s.reports);
  const createReport = useCustomReportStore((s) => s.createReport);
  const updateReport = useCustomReportStore((s) => s.updateReport);
  const deleteReport = useCustomReportStore((s) => s.deleteReport);
  const closeBuilder = useCustomReportStore((s) => s.closeBuilder);

  const existing = useMemo(
    () => (editingId ? reports.find((r) => r.id === editingId) : undefined),
    [editingId, reports]
  );

  const [draft, setDraft] = useState<CustomReport>(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hydrate draft when opened
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft({ ...existing });
    } else {
      setDraft({ ...EMPTY_DRAFT, id: '' });
    }
  }, [open, existing]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeBuilder();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeBuilder]);

  if (!open) return null;

  const isEdit = !!existing;
  const canSave = draft.name.trim().length > 0 && isDraftValid(draft);

  function handleSave() {
    if (!canSave) return;
    if (isEdit) {
      updateReport(draft.id, {
        name: draft.name.trim(),
        description: draft.description,
        source: draft.source,
        aggregation: draft.aggregation,
        field: draft.field,
        filters: draft.filters,
        groupBy: draft.groupBy,
        display: draft.display,
        limit: draft.limit,
        sortBy: draft.sortBy,
        sortDir: draft.sortDir,
        presetMetricId: draft.presetMetricId,
      });
      onSaveCallback?.(draft.id);
    } else {
      const created = createReport({
        name: draft.name.trim(),
        description: draft.description,
        source: draft.source,
        aggregation: draft.aggregation,
        field: draft.field,
        filters: draft.filters,
        groupBy: draft.groupBy,
        display: draft.display,
        limit: draft.limit,
        sortBy: draft.sortBy,
        sortDir: draft.sortDir,
        presetMetricId: draft.presetMetricId,
      });
      onSaveCallback?.(created.id);
    }
    closeBuilder();
  }

  function handleDelete() {
    if (!isEdit) return;
    deleteReport(draft.id);
    setConfirmDelete(false);
    closeBuilder();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeBuilder();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? 'Edit custom report' : 'New custom report'}
          className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-[1040px] max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)]">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {isEdit ? 'Edit report' : 'New report'}
              </div>
              <div className="text-[16px] font-extrabold text-[var(--text-primary)] truncate">
                {draft.name || 'Untitled report'}
              </div>
            </div>
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold text-[var(--danger)] hover:bg-[var(--danger-tint)] transition-colors"
              >
                <Trash size={14} weight="bold" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={closeBuilder}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body — two columns */}
          <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,420px)_1fr] gap-0">
            {/* Left: form */}
            <div className="border-r border-[var(--border)] p-5 overflow-hidden bg-[var(--surface-card)]">
              <ReportBuilderForm
                draft={draft}
                onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              />
            </div>

            {/* Right: preview */}
            <div className="p-5 bg-[var(--surface-page)] overflow-hidden flex flex-col">
              <ReportBuilderPreview draft={draft} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-card)]">
            <button
              type="button"
              onClick={closeBuilder}
              className="h-9 px-4 rounded-lg text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FloppyDisk size={14} weight="fill" />
              {isEdit ? 'Save changes' : 'Save report'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete report?"
        message={`This will permanently delete "${draft.name}". Any dashboards using it will show a placeholder.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function isDraftValid(d: CustomReport): boolean {
  if (d.source === 'cross-object') return !!d.presetMetricId;
  if (d.aggregation !== 'count' && !d.field) return false;
  if (d.display !== 'number' && d.display !== 'table' && !d.groupBy) return false;
  return true;
}
