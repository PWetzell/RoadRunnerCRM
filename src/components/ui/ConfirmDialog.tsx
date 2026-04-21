'use client';

import { Warning, Trash, X } from '@phosphor-icons/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', confirmVariant = 'danger', onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Modal */}
      <div
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[440px] max-w-[95vw] shadow-lg animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-[15px] font-extrabold text-[var(--text-primary)]">{title}</h3>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all bg-transparent border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--danger-bg)] flex items-center justify-center">
            <Warning size={28} className="text-[var(--danger)]" />
          </div>
          <div className="text-sm text-[var(--text-primary)] leading-relaxed">{message}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-raised)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-[var(--radius-sm)] flex items-center gap-1.5 transition-all cursor-pointer ${
              confirmVariant === 'danger'
                ? 'bg-[var(--danger)] hover:bg-[#B91C1C]'
                : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-dark)]'
            }`}
          >
            <Trash size={14} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
