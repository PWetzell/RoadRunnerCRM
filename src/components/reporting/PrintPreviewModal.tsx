'use client';

import { useMemo, useEffect, useState } from 'react';
import { X, Printer, FilePdf, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react';
import { CustomReport } from '@/types/custom-report';
import { useCustomReportStore } from '@/stores/custom-report-store';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { useUserStore } from '@/stores/user-store';
import { runReport } from '@/lib/custom-report-engine';
import { CustomReportPrintPage } from './CustomReportPrintView';

interface Props {
  open: boolean;
  /** One or many reportIds. Multi-report previews render as stacked pages. */
  reportIds: string[];
  onClose: () => void;
}

/**
 * In-app print preview modal.
 *
 * Shows an 8.5×11 page-sized canvas with the real print layout rendered
 * inside, exactly as it will appear on paper / PDF. The user can scroll
 * through multi-page packets, zoom, and then click "Print / Save as PDF"
 * which fires the store's print-trigger (and the hidden print host fires
 * window.print() behind the scenes).
 *
 * Design goal: buyers on Etsy should feel confident about the export output
 * without having to open the browser dialog as a test — classic SaaS UX.
 */
export default function PrintPreviewModal({ open, reportIds, onClose }: Props) {
  const reports = useCustomReportStore((s) => s.reports);
  const startPrint = useCustomReportStore((s) => s.startPrint);

  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);
  const user = useUserStore((s) => s.user);

  const [zoom, setZoom] = useState(0.75);

  const pages = useMemo(() => {
    return reportIds
      .map((id) => reports.find((r) => r.id === id))
      .filter((r): r is CustomReport => !!r)
      .map((report) => ({
        report,
        result: runReport(report, { deals, contacts, documents }),
      }));
  }, [reportIds, reports, deals, contacts, documents]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        // Intercept Ctrl+P so users can print right from the preview
        e.preventDefault();
        handlePrint();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportIds]);

  if (!open || pages.length === 0) return null;

  const generated = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  function handlePrint() {
    // Trigger the real print flow — the store+print host will handle
    // calling window.print() once it has rendered off-screen.
    startPrint(reportIds);
    onClose();
  }

  const title = pages.length === 1
    ? `Print preview — ${pages[0].report.name}`
    : `Print preview — ${pages.length} reports`;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[92vh] flex flex-col overflow-hidden border border-[var(--border)]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Print preview</div>
            <div className="text-[16px] font-extrabold text-[var(--text-primary)] truncate">
              {pages.length === 1
                ? pages[0].report.name
                : `${pages.length} reports · one PDF packet`}
            </div>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 mr-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              aria-label="Zoom out"
              className="h-7 w-7 rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-card)]"
            >
              <MagnifyingGlassMinus size={14} weight="bold" />
            </button>
            <span className="text-[11px] font-bold text-[var(--text-secondary)] min-w-[36px] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.25, +(z + 0.1).toFixed(2)))}
              aria-label="Zoom in"
              className="h-7 w-7 rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-card)]"
            >
              <MagnifyingGlassPlus size={14} weight="bold" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Page canvas — gray background with white "paper" cards */}
        <div className="flex-1 min-h-0 overflow-auto bg-[#E2E8F0] dark:bg-[#0F172A] p-6">
          <div className="flex flex-col items-center gap-6">
            {pages.map(({ report, result }, i) => (
              <div
                key={report.id}
                style={{
                  width: 816 * zoom, // 8.5" * 96dpi
                  height: 1056 * zoom, // 11" * 96dpi
                  transformOrigin: 'top center',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  border: '1px solid #CBD5E1',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
                aria-label={`Page ${i + 1} of ${pages.length} — ${report.name}`}
              >
                {/* Inner page content scaled to fit */}
                <div
                  style={{
                    width: 816,
                    height: 1056,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    padding: 48, // 0.5in margins * 96dpi
                    color: '#0F172A',
                  }}
                >
                  <CustomReportPrintPage
                    report={report}
                    result={result}
                    generated={generated}
                    generatedBy={user?.name}
                  />
                </div>

                {/* Page number indicator */}
                {pages.length > 1 && (
                  <div className="absolute bottom-2 right-3 text-[10px] font-bold text-[#94A3B8] tabular-nums bg-white/70 px-1.5 py-0.5 rounded">
                    Page {i + 1} / {pages.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-card)]">
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {pages.length === 1
              ? 'Click "Print / Save as PDF" to open your browser\u2019s print dialog, or press Ctrl+P.'
              : `${pages.length} pages — choose "Save as PDF" in the print dialog for a single packet file.`}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-extrabold bg-[var(--brand-primary)] text-white hover:brightness-110"
            >
              <Printer size={14} weight="fill" />
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
