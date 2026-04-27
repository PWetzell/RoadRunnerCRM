'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Warning, X, Trash, User } from '@phosphor-icons/react';

interface PreviewContact {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

/**
 * Confirmation dialog for **Settings → Gmail → Remove imported contacts**.
 *
 * On open, fetches a count + a 20-row preview from /api/contacts/by-source
 * so the user sees exactly what they're about to delete before clicking
 * the destructive button. Pulled this out of GmailIntegrationSection so
 * the data fetch is only paid for when the dialog actually opens.
 *
 * Industry pattern: HubSpot's "Bulk delete" preview, Salesforce's "Mass
 * delete records" two-step. The principle is the same — destructive bulk
 * operations need a "this is what's about to disappear" surface.
 */
export default function RemoveImportedContactsDialog({ open, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [preview, setPreview] = useState<PreviewContact[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLoadError(null);
    fetch('/api/contacts/by-source?source=gmail_import&previewLimit=20')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          if (body.error === 'source_column_missing') {
            throw new Error('Database migration 0008 hasn\u2019t been applied yet. Run POST /api/debug/run-migration-0008 once and try again.');
          }
          throw new Error(body.error ?? 'Failed to load imported contacts');
        }
        setCount(body.count ?? 0);
        setPreview(body.preview ?? []);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open || typeof document === 'undefined') return null;

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1100 }}
      onClick={() => !busy && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        role="alertdialog"
        aria-labelledby="remove-imported-title"
        aria-describedby="remove-imported-body"
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[560px] max-w-[95vw] shadow-[0_16px_48px_rgba(0,0,0,0.24)] animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Warning size={18} weight="fill" className="text-[var(--danger,#dc2626)] flex-shrink-0" />
          <span id="remove-imported-title" className="text-[14px] font-extrabold text-[var(--text-primary)] flex-1">
            Remove Gmail-imported contacts?
          </span>
          <button
            onClick={onClose}
            disabled={busy}
            title="Cancel"
            aria-label="Cancel"
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer disabled:opacity-50"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div id="remove-imported-body" className="px-5 py-4 flex flex-col gap-3">
          {loading ? (
            <div className="py-8 text-center text-[12px] text-[var(--text-tertiary)]">Counting imported contacts…</div>
          ) : loadError ? (
            <div className="py-3 px-3 rounded-[var(--radius-sm)] bg-[var(--danger-bg,#fef2f2)] border border-[var(--danger,#dc2626)] text-[12px] text-[var(--danger,#dc2626)]">
              {loadError}
            </div>
          ) : count === 0 ? (
            <div className="py-6 text-center text-[12.5px] text-[var(--text-secondary)]">
              No contacts in this account are tagged as Gmail-imported. You can safely close this dialog.
            </div>
          ) : (
            <>
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed m-0">
                You&rsquo;re about to permanently delete{' '}
                <strong className="text-[var(--text-primary)]">{count.toLocaleString()}</strong>{' '}
                contact{count === 1 ? '' : 's'} that the Gmail import wizard created. Their associated
                email-to-contact match rows are removed automatically; the underlying messages stay in
                your timeline. Manually-entered contacts are not touched. <strong>This cannot be undone.</strong>
              </p>

              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border)] bg-[var(--surface-card)]">
                  Preview {count > preview.length ? `(showing ${preview.length} of ${count.toLocaleString()})` : `(${preview.length})`}
                </div>
                <div className="max-h-[260px] overflow-y-auto">
                  {preview.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0">
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-bg)] flex items-center justify-center flex-shrink-0">
                        <User size={11} weight="duotone" className="text-[var(--brand-primary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{c.name}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)] truncate">{c.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-[34px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={handleConfirm}
            disabled={busy || loading || !!loadError || count === 0}
            className="inline-flex items-center gap-1.5 h-[34px] px-5 text-[12px] font-bold text-white bg-[var(--danger,#dc2626)] border border-[var(--danger,#dc2626)] rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash size={13} weight="bold" />
            {busy ? 'Removing…' : count > 0 ? `Remove ${count.toLocaleString()} contact${count === 1 ? '' : 's'}` : 'Remove'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
