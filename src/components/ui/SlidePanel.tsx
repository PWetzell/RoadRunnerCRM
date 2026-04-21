'use client';

import { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Width of the panel. Default: 580px */
  width?: number;
  children: React.ReactNode;
  /** Footer content (save/cancel buttons) */
  footer?: React.ReactNode;
}

/**
 * Full-height slide-out panel from the right edge. Used for New Lead,
 * New Contact, and other creation flows that benefit from staying in
 * context (no full-page navigation, the list is still visible behind).
 *
 * - Slides in with spring-like ease (CSS animation)
 * - Dark backdrop
 * - Header with title + close button
 * - Scrollable body
 * - Optional sticky footer for actions
 */
export default function SlidePanel({ open, onClose, title, width = 580, children, footer }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] animate-[fadeIn_0.2s_ease-out]" />

      {/* Panel */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 bg-[var(--surface-card)] border-l border-[var(--border)] shadow-[-8px_0_24px_rgba(0,0,0,0.12)] flex flex-col animate-slide-in-right"
        style={{ width }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-[var(--border)] px-5 py-3 bg-[var(--surface-card)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
