'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Warning, X, ClockCounterClockwise, Eraser } from '@phosphor-icons/react';

interface Props {
  open: boolean;
  /** The connected Gmail address — shown so the user is clear which account they're disconnecting. */
  email?: string | null;
  /** How many synced messages would be deleted in "Forget" mode. Drives the warning copy. */
  messageCount?: number;
  onClose: () => void;
  /** Called with `purge=true` to also delete email_messages, false to just revoke + drop the connection. */
  onConfirm: (purge: boolean) => Promise<void> | void;
}

/**
 * Two-option disconnect dialog for Gmail.
 *
 *   ① Disconnect — revoke Google's tokens, drop the refresh token, but
 *     KEEP every synced message + match row. The activity timeline still
 *     reads correctly; sync just stops. Reversible by reconnecting.
 *
 *   ② Forget my email history — same as ① plus delete every email_message
 *     and (via FK cascade) every email_contact_match this user owns.
 *     Irreversible; reconnecting starts a fresh sync from the present.
 *
 * The two-button choice is deliberate: HubSpot/Salesforce both lump these
 * into one "Disconnect" button and surprise the user with whichever default
 * they picked. Splitting the action makes intent explicit, which matters
 * because the data isn't recoverable in the purge case.
 */
export default function GmailDisconnectDialog({ open, email, messageCount, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState<'keep' | 'forget' | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open || typeof document === 'undefined') return null;

  async function run(purge: boolean) {
    if (busy) return;
    setBusy(purge ? 'forget' : 'keep');
    try {
      await onConfirm(purge);
    } finally {
      // Parent closes us; clear local state so reopen starts fresh.
      setBusy(null);
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
        aria-labelledby="gmail-disconnect-title"
        aria-describedby="gmail-disconnect-body"
        className="relative bg-[var(--surface-card)] border border-[var(--border)] rounded-xl w-[520px] max-w-[95vw] shadow-[0_16px_48px_rgba(0,0,0,0.24)] animate-[fadeUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Warning size={18} weight="fill" className="text-[var(--warning)] flex-shrink-0" />
          <span id="gmail-disconnect-title" className="text-[14px] font-extrabold text-[var(--text-primary)] flex-1">
            Disconnect Gmail?
          </span>
          <button
            onClick={onClose}
            disabled={!!busy}
            title="Cancel"
            aria-label="Cancel"
            className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer disabled:opacity-50"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div id="gmail-disconnect-body" className="px-5 py-4 flex flex-col gap-3">
          <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed m-0">
            We&rsquo;ll revoke Roadrunner&rsquo;s access to{' '}
            <strong className="text-[var(--text-primary)]">{email ?? 'your Gmail account'}</strong>{' '}
            and stop syncing new messages. Pick what should happen to the{' '}
            {typeof messageCount === 'number' ? <strong className="text-[var(--text-primary)]">{messageCount.toLocaleString()}</strong> : 'previously'}{' '}
            synced messages already in your timeline:
          </p>

          <Option
            tone="neutral"
            icon={<ClockCounterClockwise size={20} weight="duotone" />}
            title="Disconnect, keep tracking history"
            body="Existing messages stay in contact timelines. Reconnect anytime to resume sync — your refresh token is replaced, no data is lost."
            cta="Disconnect"
            busy={busy === 'keep'}
            disabled={!!busy}
            onClick={() => run(false)}
          />

          <Option
            tone="danger"
            icon={<Eraser size={20} weight="duotone" />}
            title="Forget my email history"
            body="Disconnect and permanently delete every synced message and contact match for this account. Contacts themselves are kept. This cannot be undone."
            cta="Disconnect & forget"
            busy={busy === 'forget'}
            disabled={!!busy}
            onClick={() => run(true)}
          />
        </div>

        {/* Footer — only Cancel; the two destructive choices are inline above
             so the user reads them as a single "pick one of three things"
             instead of "press Cancel or one of two scary buttons." */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end">
          <button
            onClick={onClose}
            disabled={!!busy}
            className="h-[32px] px-4 text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] bg-transparent cursor-pointer hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Option({
  tone, icon, title, body, cta, busy, disabled, onClick,
}: {
  tone: 'neutral' | 'danger';
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const danger = tone === 'danger';
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-[var(--radius-sm)] border ${
        danger ? 'border-[var(--danger,#dc2626)] bg-[var(--danger-bg,#fef2f2)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'
      }`}
    >
      <span className={`flex-shrink-0 mt-0.5 ${danger ? 'text-[var(--danger,#dc2626)]' : 'text-[var(--text-secondary)]'}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-extrabold text-[var(--text-primary)]">{title}</div>
        <div className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed mt-0.5">{body}</div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-shrink-0 h-[30px] px-3 text-[11.5px] font-bold rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          danger
            ? 'text-white bg-[var(--danger,#dc2626)] border border-[var(--danger,#dc2626)] hover:opacity-90'
            : 'text-[var(--text-primary)] bg-white border border-[var(--text-primary)] hover:bg-[var(--surface-2)]'
        }`}
      >
        {busy ? 'Working…' : cta}
      </button>
    </div>
  );
}
