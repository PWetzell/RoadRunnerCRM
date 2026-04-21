'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Warning, Info, X, XCircle } from '@phosphor-icons/react';
import { Toast as ToastModel, ToastSeverity, useToastStore } from '@/stores/toast-store';

/**
 * Severity → (icon, accent color, bg tint) mapping.
 * Colors align with the design tokens already in globals.css so toasts
 * read consistently in both light and dark themes.
 */
const SEV_STYLE: Record<ToastSeverity, {
  Icon: typeof CheckCircle;
  accent: string;
  bg: string;
  border: string;
  label: string;
}> = {
  success: {
    Icon: CheckCircle,
    accent: 'var(--success)',
    bg: 'var(--success-bg)',
    border: 'var(--success)',
    label: 'Success',
  },
  error: {
    Icon: XCircle,
    accent: 'var(--danger)',
    bg: 'var(--danger-bg)',
    border: 'var(--danger)',
    label: 'Error',
  },
  warning: {
    Icon: Warning,
    accent: 'var(--warning)',
    bg: 'var(--warning-bg)',
    border: 'var(--warning)',
    label: 'Warning',
  },
  info: {
    Icon: Info,
    accent: 'var(--info)',
    bg: 'var(--info-bg)',
    border: 'var(--info)',
    label: 'Info',
  },
};

/**
 * Single toast notification.
 *
 * Layout (mirrors the reference design):
 *   [colored side banner w/ icon] [ title / description / action ] [× close]
 *
 * Auto-dismisses after `duration` ms (pauses on hover). Click-X to dismiss
 * immediately. Clicking the inline action runs the handler + dismisses.
 */
export default function Toast({ toast: t }: { toast: ToastModel }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [hovered, setHovered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const style = SEV_STYLE[t.severity];

  // Auto-dismiss timer. Pauses on hover so the user can read longer toasts.
  useEffect(() => {
    if (!t.duration || t.duration <= 0) return;
    if (hovered) return;
    const elapsed = Date.now() - t.createdAt;
    const remaining = Math.max(0, t.duration - elapsed);
    const timer = setTimeout(() => handleClose(), remaining);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.duration, t.createdAt, hovered]);

  const handleClose = () => {
    setExiting(true);
    // Let the fade-out animation play before removing from the store
    setTimeout(() => dismiss(t.id), 180);
  };

  const handleAction = () => {
    t.action?.onClick();
    handleClose();
  };

  return (
    <div
      role="status"
      aria-live={t.severity === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-stretch rounded-lg border bg-[var(--surface-card)] shadow-lg overflow-hidden min-w-[340px] max-w-[480px] transition-all ${
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-[fadeUp_0.2s_ease-out]'
      }`}
      style={{ borderColor: style.border }}
    >
      {/* Colored side banner with severity icon */}
      <div
        className="flex-shrink-0 flex items-start justify-center px-3 py-3"
        style={{ background: style.bg, borderRight: `1px solid ${style.border}` }}
      >
        <style.Icon size={18} weight="fill" style={{ color: style.accent }} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 py-2.5 px-3">
        <div className="text-[13px] font-extrabold text-[var(--text-primary)] leading-tight">
          {t.title}
        </div>
        {t.description && (
          <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-snug">
            {t.description}
          </div>
        )}
        {t.action && (
          <button
            onClick={handleAction}
            className="mt-1.5 text-[12px] font-bold bg-transparent border-none cursor-pointer hover:underline p-0"
            style={{ color: style.accent }}
          >
            {t.action.label}
          </button>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        aria-label="Dismiss"
        className="flex-shrink-0 w-8 h-8 m-1 self-start rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
